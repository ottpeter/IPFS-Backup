import React from 'react';
import { useParams } from 'react-router-dom';

export default function BackupDetails() {
  const { commP } = useParams();

  return (
    <main id="backupDetails">
      <h1>BackupDetails for {commP}</h1>
    </main>
  )
}
