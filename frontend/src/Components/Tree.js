import React from 'react';

export default function Tree({ mfsTreeObj, setPath, depth = 0  , path = "" }) {
  let dashString = "";
  for (let i = 0; i < depth; i++) {
    dashString += "--";
  }

  if (typeof mfsTreeObj === "object" && mfsTreeObj !== null) {
    return (
      <div className="mfsFolder">
        {Object.entries(mfsTreeObj).map(([key, value]) => 
        {
        if (key === "/") 
          return <></>;
        else
          return (
            <React.Fragment>
              <code onClick={() => setPath(path + key)} className="mfsEntry">
                {dashString}{key}
              </code>
              <Tree mfsTreeObj={value} setPath={setPath} depth={depth+1} path={path + "/" + key + "/"}/>
            </React.Fragment>
          )})}
      </div>
    )
  } else {
    return <p></p>;
  }
}
