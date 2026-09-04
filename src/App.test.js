import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders header navigation links', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  
  const retailLink = screen.getByText(/Retail Customer/i);
  expect(retailLink).toBeInTheDocument();
  
  const stockLink = screen.getByText(/Stock Management/i);
  expect(stockLink).toBeInTheDocument();
});
