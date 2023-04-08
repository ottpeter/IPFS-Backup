import React from 'react';
import { Link } from 'react-router-dom';


export default function Menu() {
  return (
    <nav>
      <ul>
        <Link to={'/dashboard'}><li>Dashboard</li>  </Link>
        <Link to={'/backup'}><li>Create Backup</li></Link>
      </ul>
    </nav>
  )
}
