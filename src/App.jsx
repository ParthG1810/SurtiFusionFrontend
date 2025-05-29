import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';

import Login      from './pages/Login';
import Register   from './pages/Register';
import DashboardLayout from './components/DashboardLayout';
import ErrorBoundary   from './components/ErrorBoundary';
import MealPlans  from './pages/MealPlans';
import Customers  from './pages/Customers';
import PlaceOrder from './pages/PlaceOrder';
import History    from './pages/History';
import DailyCounts from './pages/DailyCounts';
import LabelFormat from './pages/LabelFormat';
import Unauthorized from './pages/Unauthorized';

const PrivateRoute = ({ children, roles }) => {
  const token = sessionStorage.getItem('token');
  const role  = sessionStorage.getItem('role');
  if (!token) return <Navigate to="/login" replace />;
  try { jwt_decode(token); }
  catch { return <Navigate to="/login" replace />; }
  if (roles && !roles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route path="/" element={<PrivateRoute><DashboardLayout/></PrivateRoute>}>
          <Route index             element={<MealPlans />} />
          <Route path="meal-plans" element={<MealPlans />} />
          <Route path="place-order" element={<PlaceOrder />} />
          <Route path="history"    element={<History />} />
          <Route path="daily-counts" element={<DailyCounts />} />
          <Route path="label-format" element={<LabelFormat />} />
          <Route path="customers"  element={<PrivateRoute roles={[ 'admin' ]}><Customers/></PrivateRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;