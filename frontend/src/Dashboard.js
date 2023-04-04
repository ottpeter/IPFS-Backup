import { useState, useEffect } from 'react';
import './styles.css';


function App() {
  const [contractAddress, setContractAddress] = useState("0x1cbB663F29a3EF12528BB8F66A906131f277b7CB");
  const [contractFunds, setContractFunds] = useState(0);

  return (
    <main id="dashboard">
      <h1>Contract Address:</h1>
      <h2>{contractAddress}</h2>

      <h1>Available funds:</h1>
      <h2>{contractFunds} {" FIL"}</h2>
    </main>
  );
}

export default App;
