import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import { HashRouter, Route, Navigate, Routes } from "react-router-dom";
import Dashboard from './Dashboard';
import StartBackup from './StartBackup';
import Menu from './Menu';
import Footer from './Footer';
import './styles.css';
import BackupDetails from './BackupDetails';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <Menu />
      <Routes>
        <Route
          exact
          path='/'
          element={<Navigate replace to='/dashboard' ></Navigate>} >
        </Route>

        <Route
          exact
          path='/dashboard'
          element={<Dashboard />}>
        </Route>

        <Route
          exact
          path='/backup'
          element={<StartBackup />}>
        </Route>

        <Route
          exact
          path='/backupDetails/:commP'
          element={<BackupDetails />}
        >  
        </Route>

      </Routes>
      <Footer />
    </HashRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
