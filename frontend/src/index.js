import React from 'react';
import ReactDOM from 'react-dom/client';
import { Flip, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import reportWebVitals from './reportWebVitals';
import { HashRouter, Route, Navigate, Routes } from "react-router-dom";
import Dashboard from './Dashboard';
import StartBackup from './StartBackup';
import BackupDetails from './BackupDetails';
import Menu from './Menu';
import Footer from './Footer';
import 'react-tooltip/dist/react-tooltip.css';
import './styles.css';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <ToastContainer toastClassName={'toastClass'} closeButton={false} transition={Flip}/>
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
