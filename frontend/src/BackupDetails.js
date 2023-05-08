import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import CID from 'cids';
import { Tooltip } from 'react-tooltip';
import contractObj from "./DealClient.json"
import { network } from './network';
import { useParams } from 'react-router-dom';

const CONTRACT_ADDRESS = network.contract;

export default function BackupDetails() {
  const backupRegEx = /()backup([0-9]{13,14})/;
  const folderRegEx = /(.*)_folder([0-9]{13,14})/;
  const incRegEx = /inc([0-9]{13,14})/;

  let RegEx = /[0-9]{13,14}/;

  const { commP } = useParams();
  const [folderName, setFolderName] = useState("");
  const [date, setDate] = useState(null);
  const [type, setType] = useState("");
  const [totalDealCount, setTotalDealCount] = useState(0);
  const [atLeastMonth, setAtLeastMonth] = useState(0);
  const [targetRedundancy, setTargetRedundancy] = useState(0);
  const [pieceSize, setPieceSize] = useState(0);
  const [payloadCID, setPayloadCID] = useState("");
  const [dealDuration, setDealDuration] = useState(0);
  const [maxPricePerEpoch, setMaxPricePerEpoch] = useState(0);
  const [originalLocation, setOriginalLocation] = useState("");
  const [carSize, setCarSize] = useState(0);
  const [dealArrayId, setDealArrayId] = useState(0);
  const [deals, setDeals] = useState([]);

  const networkId = network.defaultNetwork;
  const provider = new ethers.BrowserProvider(window.ethereum)
  const commPasBytes = new CID(commP).bytes;

  async function loadBackupItem() {
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner()
    const dealClient = new ethers.Contract(CONTRACT_ADDRESS, contractObj.abi, provider);              // Contract Instance
    const backupItem = await dealClient.getBackupItem(commPasBytes);                                  // Smart contract call (view)
    
    const name = backupItem[0].toString();                                                            // Backup name (e.g. backup1680889209258)
    
    let match = backupRegEx.exec(name);
    console.log(match);
    if (match) {
      setType("full");
    } else {
      match = folderRegEx.exec(name);
      if (match) {
        setType("folder");
        setFolderName(match[1]);
      } else {
        match = incRegEx.exec(name);
        if (match) {
          setType("incremental");
        } else {
          console.error("Error. We don't no what type of backup is this.");
          return;
        }
      }
    }

    const dateString = match ? match[2] : '';
    const timestamp = Number.parseInt(dateString);
    const time = new Date(timestamp);
    setDate(time);
    
    setTotalDealCount(Number.parseInt(backupItem[1].toString()));
    setAtLeastMonth(Number.parseInt(backupItem[2].toString()));
    setTargetRedundancy(Number.parseInt(backupItem[3].toString()));
    setPieceSize(Number.parseInt(backupItem[4].toString()));
    setPayloadCID(backupItem[5]);
    setDealDuration(Number.parseInt(backupItem[6].toString()));
    setMaxPricePerEpoch(Number.parseInt(backupItem[7].toString()));
    setOriginalLocation(backupItem[8]);
    setCarSize(Number.parseInt(backupItem[9].toString()))
    setDealArrayId(Number.parseInt(backupItem[10].toString()));

    const fetchedDeals = await dealClient.getDeals(commPasBytes);

    if (fetchedDeals.length === 0) {
      setDeals([]);
    } else {
      const processedDeals = fetchedDeals.map((dealItem) => {
        return {
          dealId: Number.parseInt(dealItem[0].toString()),
          providerAddress: dealItem[1],
          startEpoch: Number.parseInt(dealItem[2].toString()),
          endEpoch: Number.parseInt(dealItem[3].toString()),
          status: {
            activated: Number.parseInt(dealItem[4][0].toString()),
            terminated: Number.parseInt(dealItem[4][1].toString())
          },
          isActive: dealItem[5]
        }
      });
      console.log("processed DEALS", processedDeals)
      setDeals(processedDeals)
    }

    console.log("Fetched Deals: ", fetchedDeals);
    console.log("backupItem: ", backupItem  );
    //setLoading(false);
  }
  
  useEffect(() => {
    toast.promise(loadBackupItem, {
      pending: {
        render(){
          return "Loading..."
        },
      },
      error: {
        render({data}){
          return "Error while loading data."
        },
      }
    }, { toastId: 0});
  }, [commP]);

  
  async function refreshMetadata() {
    const refreshPromise = new Promise(async (resolve, reject) => {
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner()
      const dealClient = new ethers.Contract(CONTRACT_ADDRESS, contractObj.abi, signer);
      const result = await dealClient.refreshMetadataForBackupItem(commPasBytes);
      console.log(result)
      if (result) {
        resolve("Metadata was updated in contract");
      } else {
        reject("Reject message.");
      }
    });
    toast.promise(refreshPromise, {
      pending: {
        render(){
          return "Refreshing metadata in contract..."
        },
        icon: false,
      },
      success: {
        render({data}){
          return `${data}`
        },
        icon: "🟢",
      },
      error: {
        render({data}){
          return <p>{data}</p>
        }
      }
    });
  }

  async function reloadData() {
    toast.promise(loadBackupItem, {
      pending: {
        render(){
          return "Loading..."
        },
      },
      error: {
        render({data}){
          return "Error while loading data."
        }
      }
    }, { toastId: 0});
  }

  async function keepTargetRedundancy() {
    const keepRedundancyPromise = new Promise(async (resolve, reject) => {
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner()
      const dealClient = new ethers.Contract(CONTRACT_ADDRESS, contractObj.abi, signer);
      const result = await dealClient.keepTargetRedundancy(commPasBytes);
      if (result) resolve("Successfully created new deals to keep target redundancy");
      else reject("There was an error while trying to keep target redundancy");
    });
    toast.promise(keepRedundancyPromise, {
      pending: {
        render(){
          return "Keep Target Redundancy function is running..."
        },
        icon: false,
      },
      success: {
        render({data}){
          return `${data}`
        },
        icon: "🟢",
      },
      error: {
        render({data}){
          return <p>{data}</p>
        }
      }
    });
  }

  async function changeRedundancy() {
    const newValue = window.prompt();
    const changeRedundancyPromise = new Promise(async (resolve, reject) => {
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner()
      const dealClient = new ethers.Contract(CONTRACT_ADDRESS, contractObj.abi, signer);
      const result = await dealClient.changeTargetRedundancy(commPasBytes, newValue);
      if (result) resolve("Sucessfully changed target redundancy");
      else reject("There was an error while trying to change target redundancy");
    });
    toast.promise(changeRedundancyPromise, {
      pending: {
        render(){
          return "Changing target redundancy..."
        },
        icon: false,
      },
      success: {
        render({data}){
          return `${data}`
        },
        icon: "🟢",
      },
      error: {
        render({data}){
          return <p>{data}</p>
        }
      }
    }, { toastId: 1});
  }


  return (
    <main id="backupDetails">
      {type === "full" && <h1>Full backup of the IPFS repository, made at {date ? date.toDateString() : "-"}</h1>}
      {type === "folder" && <h1>Folder backup of <i>{folderName}</i>, made at {date ? date.toDateString() : "-"}</h1>}
      {type === "incremental" && <h1>Folder backup of X, made at {date ? date.toDateString() : "-"}</h1>}
      <h2 id="detailsButtonContainer">
        <Tooltip anchorSelect=".tooltip-anchor" />

        <button 
          onClick={refreshMetadata} 
          className="detailsButton tooltip-anchor" 
          data-tooltip-html={"<p>Refresh the state of the backup item in the contract.</p><p> This will modify state.</p>"}
          data-tooltip-place="bottom"
        >
          {"Recalculate values"}
        </button>
        
        <button 
          onClick={keepTargetRedundancy}
          className="detailsButton tooltip-anchor" 
          data-tooltip-html={"<p>Bring up the backup item to target redundancy</p>"}
          data-tooltip-place="bottom"
        >
          {"Repair"}
        </button>

        <button 
          onClick={reloadData}
          className="detailsButton tooltip-anchor" 
          data-tooltip-html={"<p>Refresh this display.</p> <p>This does not modify state.</p>"}
          data-tooltip-place="bottom"
        >
          {"Refresh display"}
        </button>

        <button
          onClick={changeRedundancy}
          className="detailsButton tooltip-anchor" 
          data-tooltip-html={"<p>Change the target redundancy for this backup item</p>"}
          data-tooltip-place="bottom"
        >
          {"Change target redundancy"}
        </button>
        
        <button 
          className="detailsButton tooltip-anchor" 
          data-tooltip-html={"<p>Delete this backup item</p><p>Will terminate all deals</p>"}
          data-tooltip-place="bottom"
          disabled={true}
        >
          {"Delete all"}
        </button>

      </h2>

      {/*loading && <div className="loading">
        {"Loading ..."}
  </div>*/}

      <section id="detailsCard">
        <div className="infoElement">
          <p className="label">{"Total Deal Count: "}</p>
          <p className="value">{totalDealCount}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Deals that are valid for more than a month:"}</p>
          <p className="value">{atLeastMonth}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Target Redundancy: "}</p>
          <p className="value">{targetRedundancy}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Piece CID: "}</p>
          <p className="value">{commP}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Piece Size: "}</p>
          <p className="value">{pieceSize}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Original deal duration: "}</p>
          <p className="value">{dealDuration}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Max price per epoch: "}</p>
          <p className="value">{maxPricePerEpoch}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Original Location: "}</p>
          <p className="value">{originalLocation}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Payload CID: "}</p>
          <p className="value">{payloadCID}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Payload Size: "}</p>
          <p className="value">{carSize}</p>
        </div>
        
        {/*<div className="infoElement">
          <p className="label">{"Deal Array ID: "}</p>
          <p className="value">{dealArrayId}</p>
        </div>*/}

        <div className="infoElement">
          <p className="label">{"Deals:"}</p>
          <p className="value">{null}</p>
        </div>
        <div className="infoElement">
          <ul className="dealList">
            {deals.map((deal) => {
              console.log("This is the deal display function.")
              console.log("Current deal: ", deal)

              return (
                <li className="dealElement" key={deal.dealId}>
                  <div className="infoElement">
                    <p className="label">{"Deal ID:"}</p>
                    <p className="value">{deal.dealId}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"Provider Address:"}</p>
                    <p className="value">{deal.providerAddress}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"Start Epoch:"}</p>
                    <p className="value">{deal.startEpoch}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"End Epoch:"}</p>
                    <p className="value">{deal.endEpoch}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"Activated:"}</p>
                    <p className="value">{deal.status.activated}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"Terminated:"}</p>
                    <p className="value">{deal.status.terminated}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"Active:"}</p>
                    <p className="value">{deal.isActive.toString()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  )
}
