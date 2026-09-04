import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  const style = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '60vh',
    textAlign: 'center'
  };

  return (
    <div style={style}>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Go back to the Retail Customer page</Link>
    </div>
  );
};

export default NotFound;
