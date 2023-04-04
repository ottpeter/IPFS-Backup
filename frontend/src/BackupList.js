import React from 'react';


// @whichOneSwitch full | folder | incremental (inceremental does not exist yet)
export default function BackupList({whichOneSwitch, backupList}) {
  let title = null;
  const RegEx = /[0-9]{13,14}/;
  
  switch (whichOneSwitch) {
    case "full":
      title = "Full Backups";
      break;
    case "folder":
      title = "Folder Backups";
      break;
    case "incremental":
      title = "Incremental Backups";
      break;
    default:
      title = "{Application error}";
      break;
  }

  return (
      <details className="backupList">
        <summary>{title}</summary>
        {backupList.length > 0 ? (
          <ul>
            {backupList.map((backup) => {
              const dateString = RegEx.exec(backup.name)[0];
              const timestamp = Number.parseInt(dateString);
              const time = new Date(timestamp);

              return (
                <li className="backupEntry">
                  <p>{"Time of backup: "}{time.toDateString()}</p>
                  <p>{"CommP:"}{backup.commP}</p>
                </li>
              )
            })}
          </ul>
        )
        : 
          <ul>
            <p>{"This list is empty."}</p>
          </ul>
        }
      </details>
  )
}
