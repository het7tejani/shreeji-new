
import React, { useEffect, useState, useCallback } from 'react';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { apiFetch } from '../../api';

const Revenue = () => {
    // Global Dashboard Period
    const [period, setPeriod] = useState('fiscal_year'); 
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Liability List State
    const [purchaseDues, setPurchaseDues] = useState([]);
    const [showLiabilityList, setShowLiabilityList] = useState(false);
    const [loadingLiabilities, setLoadingLiabilities] = useState(false);

    // Graph Specific State
    const [graphMode, setGraphMode] = useState('global'); // 'global' | 'monthly'
    const [graphMonth, setGraphMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [monthlyGraphData, setMonthlyGraphData] = useState(null);
    const [loadingGraph, setLoadingGraph] = useState(false);

    // Helper function defined outside or inside with useCallback if used in effects
    const fillMonthlyGaps = useCallback((trends, keys, referenceDate) => {
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth(); // 0-indexed
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const trendMap = new Map();
        trends.forEach(t => trendMap.set(t.date, t));
        
        const filled = [];
        for (let i = 1; i <= daysInMonth; i++) {
            // Construct YYYY-MM-DD
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            if (trendMap.has(dateStr)) {
                filled.push(trendMap.get(dateStr));
            } else {
                const entry = { date: dateStr };
                keys.forEach(k => entry[k] = 0);
                filled.push(entry);
            }
        }
        return filled;
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({ period });
            const res = await apiFetch(`/api/settings/revenue?${queryParams}`);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            let result = await res.json();

            // Post-process for 'this_month' global filter
            if (period === 'this_month' && result.trends && result.trendKeys.length > 0) {
                result.trends = fillMonthlyGaps(result.trends, result.trendKeys, new Date());
            }

            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [period, fillMonthlyGaps]);

    const fetchMonthlyGraphData = useCallback(async () => {
        setLoadingGraph(true);
        try {
            const [y, m] = graphMonth.split('-');
            const year = parseInt(y);
            const monthIndex = parseInt(m) - 1;
            
            const startDate = new Date(year, monthIndex, 1);
            const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);

            const formatDate = (d) => {
                const offset = d.getTimezoneOffset();
                const local = new Date(d.getTime() - (offset*60*1000));
                return local.toISOString().split('T')[0];
            };

            const queryParams = new URLSearchParams({ 
                period: 'custom',
                startDate: formatDate(startDate),
                endDate: formatDate(endDate)
            });

            const res = await apiFetch(`/api/settings/revenue?${queryParams}`);
            if (!res.ok) throw new Error('Failed to fetch graph data');
            let result = await res.json();

            if (result.trends) {
                result.trends = fillMonthlyGaps(result.trends, result.trendKeys, startDate);
            }

            setMonthlyGraphData(result);
        } catch (err) {
            console.error("Graph fetch error:", err);
        } finally {
            setLoadingGraph(false);
        }
    }, [graphMonth, fillMonthlyGaps]);
    
    const fetchPurchaseDues = async () => {
        setLoadingLiabilities(true);
        try {
            const res = await apiFetch(`/api/purchases/dues`);
            if (res.ok) {
                const data = await res.json();
                setPurchaseDues(data);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to load list");
        } finally {
            setLoadingLiabilities(false);
        }
    };
    
    const handleToggleLiabilityList = () => {
        if (!showLiabilityList) {
             setShowLiabilityList(true);
             fetchPurchaseDues();
        } else {
             setShowLiabilityList(false);
        }
    };

    const handleSettleVendor = async (vendorName, vendorMobile, currentDue) => {
        const amountStr = prompt(`Enter payment amount for ${vendorName} (Max ₹${currentDue.toFixed(2)}):`);
        if (amountStr === null) return;
        
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        try {
            const res = await apiFetch(`/api/purchases/settle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    vendorName, 
                    vendorMobile, 
                    amount 
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.msg);
                fetchPurchaseDues(); // Refresh list
                fetchData(); // Refresh global stats
            } else {
                alert("Error: " + data.msg);
            }
        } catch (err) {
            alert("Server Error: " + err.message);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (graphMode === 'monthly') {
            fetchMonthlyGraphData();
        }
    }, [graphMode, fetchMonthlyGraphData]);

    const handleDownloadReport = () => {
        if (!data) return;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Business Performance Report", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Period: ${getPeriodLabel(period)}`, 14, 34);
        doc.setTextColor(0);

        doc.setFontSize(14);
        doc.text(`P&L Summary (${getPeriodLabel(period)})`, 14, 45);
        
        const summaryBody = [
            ['Total Revenue (Sales)', formatCurrency(data.summary?.income || 0)],
            ['Total Expense (Purchases)', formatCurrency(data.summary?.expense || 0)],
            ['Net Profit / Loss', formatCurrency(data.summary?.profit || 0)],
        ];

        doc.autoTable({
            startY: 50,
            head: [['Metric', 'Amount']],
            body: summaryBody,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }
        });
        
        const liabilityY = doc.lastAutoTable.finalY + 15;
        doc.text("Assets & Liabilities", 14, liabilityY);
        doc.autoTable({
            startY: liabilityY + 5,
            head: [['Type', 'Value']],
            body: [
                ['Total Sales Dues (Assets)', formatCurrency(data.assets?.totalAssets || 0)],
                ['Total Purchase Dues (Liabilities)', formatCurrency(data.liabilities?.vendorDues || 0)],
            ],
            theme: 'striped'
        });

        doc.save(`Financial_Report_${period}_${Date.now()}.pdf`);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getPeriodLabel = (p) => {
        switch(p) {
            case 'this_month': return 'This Month';
            case 'fiscal_year': return 'Fiscal Year';
            case 'all_time': return 'All Time';
            default: return 'Custom Period';
        }
    };

    if (error) return <div className="card" style={{padding: '2rem', color: 'var(--danger-text)'}}>Error: {error}</div>;

    // --- Chart Components ---

    const LineChart = ({ data, keys, loading }) => {
        const [activeKeys, setActiveKeys] = useState(keys);
        const [hoverIndex, setHoverIndex] = useState(null);

        useEffect(() => {
            if (keys && keys.length > 0) {
                 setActiveKeys(keys);
            }
        }, [keys]);

        if (loading) return <p className="chart-placeholder">Loading chart data...</p>;
        if (!data || data.length < 1) return <p className="chart-placeholder">Not enough data for trend analysis.</p>;
        
        if (!keys || keys.length === 0) return <p className="chart-placeholder">No sales data in this period.</p>;

        const toggleKey = (key) => {
            setActiveKeys(prev => 
                prev.includes(key) 
                    ? prev.filter(k => k !== key) 
                    : [...prev, key]
            );
        };
        
        let maxVal = 0;
        data.forEach(d => {
            activeKeys.forEach(k => {
                if (d[k] && d[k] > maxVal) maxVal = d[k];
            });
        });
        maxVal = Math.max(maxVal, 10); 
        
        const paddingLeft = 8; 
        const paddingRight = 5; 
        const paddingBottom = 8;
        const paddingTop = 5;
        const width = 100;
        const height = 50; 
        
        const chartW = width - paddingLeft - paddingRight;
        const chartH = height - paddingBottom - paddingTop;

        const getY = (val) => (height - paddingBottom) - ((val / maxVal) * chartH);
        const getX = (index) => paddingLeft + (index / (Math.max(data.length - 1, 1))) * chartW;

        const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
        const getColor = (key) => colors[keys.indexOf(key) % colors.length];

        const yTicks = [0, maxVal/3, (maxVal/3)*2, maxVal];
        
        const xTicks = data.filter((_, i) => {
            const count = data.length;
            if (i === 0 || i === count - 1) return true;
            if (count > 20) return i % 5 === 0;
            if (count > 10) return i % 3 === 0;
            return true;
        });

        const formatNumber = (num) => Math.round(num);
        
        const formatChartDate = (dateStr) => {
            const d = new Date(dateStr);
            if (graphMode === 'monthly' || period === 'this_month') {
                return d.getDate(); 
            }
            if (dateStr.length === 7) { 
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return months[parseInt(dateStr.split('-')[1]) - 1];
            }
            return `${d.getDate()}/${d.getMonth()+1}`;
        };

        const handleMouseMove = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const svgX = (x / rect.width) * 100;
            if (svgX < paddingLeft || svgX > width - paddingRight) return;
            const fraction = (svgX - paddingLeft) / chartW;
            const index = Math.round(fraction * (data.length - 1));
            if (index >= 0 && index < data.length) setHoverIndex(index);
        };

        return (
            <div className="chart-container line-chart" style={{height: '350px', display: 'flex', flexDirection: 'column', overflow: 'visible', position: 'relative'}}>
                {hoverIndex !== null && data[hoverIndex] && (
                    <div style={{
                        position: 'absolute',
                        left: `${getX(hoverIndex)}%`,
                        top: '0', 
                        transform: `translate(${hoverIndex > data.length/2 ? '-105%' : '5%'}, 10px)`, 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '0.8rem',
                        zIndex: 20,
                        pointerEvents: 'none',
                        minWidth: '140px'
                    }}>
                        <div style={{fontWeight: 'bold', marginBottom: '0.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', color: '#0f172a'}}>
                            {data[hoverIndex].date}
                        </div>
                        {activeKeys.map(key => (
                            <div key={key} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem'}}>
                                <span style={{color: getColor(key), fontSize: '0.75rem'}}>● {key}</span>
                                <span style={{fontWeight: '600', color: '#0f172a'}}>{data[hoverIndex][key]?.toFixed(2) || 0} kg</span>
                            </div>
                        ))}
                    </div>
                )}

                <svg 
                    viewBox={`0 0 ${width} ${height}`} 
                    preserveAspectRatio="none" 
                    style={{width: '100%', height: '100%', overflow: 'visible', cursor: 'crosshair'}}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverIndex(null)}
                >
                    {hoverIndex !== null && (
                        <line x1={getX(hoverIndex)} y1={paddingTop} x2={getX(hoverIndex)} y2={height - paddingBottom} stroke="#cbd5e1" strokeWidth="0.2" strokeDasharray="1 1"/>
                    )}
                    {yTicks.map((tick, i) => (
                        <g key={`y-${i}`}>
                            <line x1={paddingLeft} y1={getY(tick)} x2={width - paddingRight} y2={getY(tick)} stroke="#e2e8f0" strokeWidth="0.1" />
                            <text x={paddingLeft - 1} y={getY(tick) + 1} fontSize="1.0" textAnchor="end" fill="#94a3b8" fontWeight="400">{formatNumber(tick)}</text>
                        </g>
                    ))}
                    {xTicks.map((d, i) => {
                        const index = data.indexOf(d);
                        let textAnchor = "middle";
                        if (index === 0) textAnchor = "start";
                        if (index === data.length - 1) textAnchor = "end";
                        return (
                            <text key={`x-${i}`} x={getX(index)} y={height - 2} fontSize="1.0" textAnchor={textAnchor} fill="#94a3b8" fontWeight="400">{formatChartDate(d.date)}</text>
                        );
                    })}
                    {activeKeys.map(key => {
                        const color = getColor(key);
                        const points = data.map((d, idx) => {
                            const val = d[key] || 0;
                            return `${getX(idx)},${getY(val)}`;
                        }).join(' ');
                        return (
                            <g key={key}>
                                <polyline points={points} fill="none" stroke={color} strokeWidth="0.3" strokeLinecap="round" strokeLinejoin="round" />
                                {hoverIndex !== null && (
                                    <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex][key] || 0)} r="1.2" fill={color} stroke="#fff" strokeWidth="0.5"/>
                                )}
                            </g>
                        );
                    })}
                    <rect x={paddingLeft} y={paddingTop} width={chartW} height={chartH} fill="transparent" />
                </svg>
                
                <div className="chart-legend" style={{flexWrap: 'wrap', marginTop: '5px', marginBottom: '5px', justifyContent: 'center', gap: '6px'}}>
                    {keys.map((key) => {
                        const isActive = activeKeys.includes(key);
                        const color = getColor(key);
                        return (
                            <button 
                                key={key} 
                                onClick={() => toggleKey(key)}
                                style={{
                                    border: '1px solid ' + (isActive ? 'transparent' : '#e2e8f0'),
                                    background: isActive ? 'transparent' : '#f8fafc',
                                    color: isActive ? color : '#94a3b8',
                                    fontSize: '0.7rem', 
                                    display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
                                    padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', opacity: isActive ? 1 : 0.6
                                }}
                            >
                                <span style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isActive ? color : '#cbd5e1'}}></span> 
                                <span style={{ textDecoration: isActive ? 'none' : 'line-through' }}>{key}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const DonutChart = ({ sources }) => {
        const total = sources.reduce((acc, curr) => acc + curr.value, 0);
        if (total === 0) return <p className="chart-placeholder">No revenue data.</p>;
        
        let currentOffset = 0;
        const colors = ['#4f46e5', '#0ea5e9', '#10b981']; 

        return (
            <div className="chart-container donut-chart-wrapper">
                <svg viewBox="0 0 42 42" className="donut-chart">
                    {sources.map((source, i) => {
                        const pct = (source.value / total) * 100;
                        if (pct < 0.5) return null;
                        
                        const dashArray = `${pct} ${100 - pct}`;
                        const offset = 25 - currentOffset; 
                        currentOffset += pct;
                        
                        return (
                            <circle
                                key={source.name}
                                cx="21" cy="21" r="15.91549430918954"
                                fill="transparent"
                                stroke={colors[i % colors.length]}
                                strokeWidth="5"
                                strokeDasharray={dashArray}
                                strokeDashoffset={offset}
                            />
                        );
                    })}
                </svg>
                <div className="chart-legend horizontal">
                    {sources.map((s, i) => (
                        <div key={s.name} className="legend-item">
                            <span className="dot" style={{backgroundColor: colors[i % colors.length]}}></span>
                            <span>
                                {s.name} 
                                <span style={{fontWeight: 'bold', marginLeft: '4px'}}>{formatCurrency(s.value)}</span>
                                <span style={{color: 'var(--text-muted)', fontSize: '0.85em', marginLeft: '4px'}}>
                                    ({((s.value/total)*100).toFixed(0)}%)
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const summary = data?.summary || { income: 0, expense: 0, profit: 0 };
    const assets = data?.assets || { retailDues: 0, wholesaleDues: 0, wholeChiliDues: 0, totalAssets: 0 };
    const liabilityTotal = data?.liabilities?.vendorDues || 0;

    const chartData = graphMode === 'monthly' ? monthlyGraphData?.trends : data?.trends;
    const chartKeys = graphMode === 'monthly' ? monthlyGraphData?.trendKeys : data?.trendKeys;
    const isChartLoading = graphMode === 'monthly' ? loadingGraph : false;

    return (
        <div className="analytics-container">
            {/* 1. Header & Controls */}
            <div className="card" style={{marginBottom: '1.5rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
                    <h2 className="card-title" style={{margin: 0, border: 'none', padding: 0}}>Business Analytics</h2>
                    <div className="filter-controls" style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                        <select 
                            value={period} 
                            onChange={(e) => setPeriod(e.target.value)}
                            className="summary-input"
                            style={{width: 'auto', textAlign: 'left'}}
                        >
                            <option value="this_month">This Month</option>
                            <option value="fiscal_year">Fiscal Year</option>
                            <option value="all_time">All Time</option>
                        </select>
                        <button className="btn btn-sm btn-secondary" onClick={handleDownloadReport} disabled={loading || !data}>
                            <span style={{fontSize: '1.1em', marginRight: '0.3rem'}}>📄</span> PDF Report
                        </button>
                    </div>
                </div>
            </div>

            {loading || !data ? (
                <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)'}}>Loading Analytics...</div>
            ) : (
                <>
                    {/* 2. Summaries */}
                    <div className="analytics-grid">
                        <div className="stat-card income">
                            <div className="stat-label">Total Revenue ({getPeriodLabel(period)})</div>
                            <div className="stat-value">{formatCurrency(summary.income)}</div>
                            <div className="stat-sub">Sales (Retail + Wholesale + Whole)</div>
                        </div>
                        <div className="stat-card expense">
                            <div className="stat-label">Total Expense ({getPeriodLabel(period)})</div>
                            <div className="stat-value">{formatCurrency(summary.expense)}</div>
                            <div className="stat-sub">Purchases (Kharidi)</div>
                        </div>
                        <div className={`stat-card ${summary.profit >= 0 ? 'profit' : 'loss'}`}>
                            <div className="stat-label">Net Profit ({getPeriodLabel(period)})</div>
                            <div className="stat-value">{formatCurrency(summary.profit)}</div>
                            <div className="stat-sub">Revenue - Expense</div>
                        </div>

                        {/* Row 2: Charts */}
                        <div className="card chart-card span-3">
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>
                                <h3 className="card-title" style={{border: 'none', margin: 0, padding: 0}}>Sales Weight Trend (kg)</h3>
                                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                    <div className="tab-navigation" style={{marginBottom: 0, padding: '2px'}}>
                                        <button 
                                            className={`tab-btn btn-sm ${graphMode === 'global' ? 'active' : ''}`}
                                            onClick={() => setGraphMode('global')}
                                        >
                                            {getPeriodLabel(period)}
                                        </button>
                                        <button 
                                            className={`tab-btn btn-sm ${graphMode === 'monthly' ? 'active' : ''}`}
                                            onClick={() => setGraphMode('monthly')}
                                        >
                                            Monthly View
                                        </button>
                                    </div>
                                    {graphMode === 'monthly' && (
                                        <input 
                                            type="month" 
                                            value={graphMonth}
                                            onChange={(e) => setGraphMonth(e.target.value)}
                                            style={{padding: '0.3rem', fontSize: '0.85rem', width: 'auto'}}
                                        />
                                    )}
                                </div>
                            </div>
                            <LineChart data={chartData} keys={chartKeys} loading={isChartLoading} />
                        </div>

                        {/* Row 3: Sources & Assets */}
                        <div className="card chart-card">
                            <h3 className="card-title">Revenue Source ({getPeriodLabel(period)})</h3>
                            <DonutChart sources={data.revenueSources} />
                        </div>
                        <div className="card span-2">
                            <h3 className="card-title" style={{display:'flex', justifyContent:'space-between'}}>
                                <span>Assets & Liabilities</span>
                                <span style={{fontSize: '0.9em', color:'var(--primary-color)'}}>Current Snapshot</span>
                            </h3>
                            <div className="assets-grid">
                                <div className="asset-item">
                                    <span className="asset-label">Market Dues (Retail)</span>
                                    <span className="asset-value danger">{formatCurrency(assets.retailDues)}</span>
                                </div>
                                <div className="asset-item">
                                    <span className="asset-label">Market Dues (Wholesale)</span>
                                    <span className="asset-value danger">{formatCurrency(assets.wholesaleDues)}</span>
                                </div>
                                <div className="asset-item">
                                    <span className="asset-label">Market Dues (Whole Chili)</span>
                                    <span className="asset-value danger">{formatCurrency(assets.wholeChiliDues)}</span>
                                </div>
                                <div className="asset-item">
                                    <span className="asset-label">Total Assets (Sales Due)</span>
                                    <span className="asset-value primary">{formatCurrency(assets.totalAssets)}</span>
                                </div>
                                
                                {/* New Liability Section */}
                                <div className="asset-item total" style={{marginTop: '0.5rem', background: '#fff7ed', border: '2px solid #ea580c'}}>
                                    <div style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <span className="asset-label" style={{color: '#9a3412'}}>Total Liabilities (Vendor Dues)</span>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                            <span className="asset-value" style={{color: '#c2410c'}}>{formatCurrency(liabilityTotal)}</span>
                                            <button 
                                                className="btn btn-sm btn-secondary" 
                                                onClick={handleToggleLiabilityList}
                                                style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}
                                            >
                                                {showLiabilityList ? 'Hide List' : 'Show List'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {showLiabilityList && (
                                    <div className="span-2" style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px', marginTop: '0.5rem'}}>
                                        {loadingLiabilities ? (
                                            <p style={{padding: '1rem', textAlign: 'center'}}>Loading...</p>
                                        ) : purchaseDues.length === 0 ? (
                                            <p style={{padding: '1rem', textAlign: 'center'}}>No pending vendor dues.</p>
                                        ) : (
                                            <table className="styled-table" style={{fontSize: '0.85rem'}}>
                                                <thead>
                                                    <tr style={{background: '#fff7ed'}}>
                                                        <th>Vendor Name</th>
                                                        <th>Mobile</th>
                                                        <th className="text-right">Balance Due</th>
                                                        <th className="text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {purchaseDues.map((pd, idx) => (
                                                        <tr key={idx}>
                                                            <td>{pd._id.name}</td>
                                                            <td>{pd._id.mobile || '-'}</td>
                                                            <td className="text-right" style={{fontWeight: 'bold', color: '#c2410c'}}>
                                                                {formatCurrency(pd.totalBalance)}
                                                            </td>
                                                            <td className="text-center">
                                                                 <button 
                                                                    className="btn btn-sm btn-primary"
                                                                    onClick={() => handleSettleVendor(pd._id.name, pd._id.mobile, pd.totalBalance)}
                                                                    style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}
                                                                 >
                                                                    Pay
                                                                 </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 4: Product Performance */}
                        <div className="card span-3">
                            <h3 className="card-title">Top Selling Spices ({getPeriodLabel(period)})</h3>
                            <ul className="ranking-list">
                                {data.topProducts.map((p, i) => (
                                    <li key={p.id}>
                                        <span className="rank">#{i+1}</span>
                                        <span className="name">{p.name}</span>
                                        <span className="val">{formatCurrency(p.revenue)}</span>
                                    </li>
                                ))}
                                {data.topProducts.length === 0 && <li className="empty">No sales data found.</li>}
                            </ul>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Revenue;
