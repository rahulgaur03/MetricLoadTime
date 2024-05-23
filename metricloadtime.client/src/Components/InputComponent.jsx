import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
// import Button from 'react-bootstrap/Button'; 
import axios from 'axios';
import Select from 'react-select';

import Modal from 'react-bootstrap/Modal';

const InputComponent = ({ filePathArray, setFilePathArray, filePath, setFilePath, setCombinations, inputs,setInputs }) => {


  const [model, setModel] = useState('powerbi');
  const [progress, setProgress] = useState({ Total: 0, Progress: 0 });
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [progresspopoverVisible, setprogressPopoverVisible] = useState(false);
  const [displayedfile, setDisplayedfile] = useState([]);


  const handleFileInputChange = (e) => {
    setFilePath(e.target.value);
  };

  const handleFileAddButtonClick = () => {
    if (filePath.trim() !== '') {
        setDisplayedfile([...displayedfile, filePath]);
        setFilePath(''); 
        let filearray = filePathArray
        filearray.push(filePath)
        setFilePathArray(filearray)
    }
  };


  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")


  const handleemail = (e) => {
    setEmail(e.target.value)
  }
  const handlepassword = (e) => {
    setPassword(e.target.value)
  }

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    const inputValue = type === 'checkbox' ? 1 : value;

    setInputs({
      ...inputs,
      [name]: inputValue,
    });
  };

  const handleModelClick = (modelType) => {
    setModel(modelType);
    setInputs({
      ...inputs,
      modelName: '',
      xmlaEndpoint: '', // Reset these inputs when switching models
    });
  };

  const handleResetClick = () => {
    setInputs({
      ...inputs,
      // filePath: '',
      modelName: '',
      xmlaEndpoint: '',
      thresholdValue: '',
      runningForFirstTime: false,
    });
  };

  const handleRemoveFile = (event) => {
    let file = event.target.innerText.slice(0,-2).concat(".pbix")
    // console.log(file)
    // console.log(filePathArray)
    // filePathArray.forEach(element => {
    //   if(element.endsWith("Refresh Tracker.pbix")){
    //     console.log("asdfa")
    //   }
    // });
    let filteredPathArray = filePathArray.filter(path => !path.endsWith(file));
    let fileteredFileArray = displayedfile.filter(function(e) { return e !== event.target.innerText.slice(0,-2) })
    setFilePathArray(filteredPathArray)
    console.log(displayedfile)
    // setDisplayedfile(fileteredFileArray)
    setDisplayedfile(filteredPathArray)

    // console.log(filteredPathArray)
  }

  const analyze = async () => {
    let analyzePromise; // Define generateCombinationsPromise outside the try block
    try {
      const requestBody = {
        FilePath: filePathArray,
        ModelName: inputs.modelName,
        EndPoint: inputs.xmlaEndpoint,
        ThresholdValue: parseInt(inputs.thresholdValue),
        RunningFirstTime: parseInt(inputs.runningForFirstTime),
      };

      analyzePromise = fetch('api/adomd/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });


      const analyzeResponse = await analyzePromise;
      if (analyzeResponse.ok) {
        analyzeResponse.clone().json().then(result => console.log(JSON.parse(result)));
      }

      setPopoverVisible(true);
    } catch (error) {
      console.error(error);
    }

  }



  const login = async () => {
    let generateCombinationsPromise; 
    try {
      const requestBody = {
        Username: String(email),
        Password: String(password),
      };


      console.log(requestBody)

      generateCombinationsPromise = fetch('api/adomd/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      setprogressPopoverVisible(true);
      setPopoverVisible(false)
    } catch (error) {
      console.error(error);
    }


    const intervalId = setInterval(async () => {
      try {
        const progressResponse = await fetch('api/adomd/progressBar');
        if (!progressResponse.ok) {
          clearInterval(intervalId);
          throw new Error('Failed to get progress');
        }
        const progressData = await progressResponse.json();
        console.log(progressData);
        setProgress(progressData);

        if (generateCombinationsPromise) {
          const generateCombinationsResponse = await generateCombinationsPromise;
          if (generateCombinationsResponse.ok) {
            // console.log(generateCombinationsResponse.json())
            generateCombinationsResponse.clone().json().then(results => setCombinations(results));
            setPopoverVisible(false)
            setprogressPopoverVisible(false);
            clearInterval(intervalId); // Stop polling if generateCombinationsPromise is resolved
          } else {
            clearInterval(intervalId); // Stop polling if generateCombinationsPromise fails
          }
        }
      } catch (error) {
        console.error(error);
      }
    }, 2000); 
  };
  const hasInputValues = Object.values(inputs).some(value => value !== '');



  return (
    <>

      <div className="container mt-5 border">
        <div className="innercontainer modeltabcontainer container mt-4 mx-3 mb-5" style={{ width: '90%' }}>
          <div className="tabs border-bottom d-flex">
            <div className="powerbimodel">
              <button type="button" className={model === 'powerbi' ? 'btn inputselectedbutton' : 'btn inputunselectedbutton'} onClick={() => handleModelClick('powerbi')}>
                Power BI Model
              </button>
            </div>
            <div className="tabularmodel mx-1">
              <button type="button" className={model === 'tabular' ? 'btn inputselectedbutton' : 'btn inputunselectedbutton'} onClick={() => handleModelClick('tabular')}>
                Tabular Model
              </button>
            </div>
          </div>
        </div>

        <div className="inputs container mx-5 mr-3" style={{ width: '85%' }}>
          <div className="filepathinput d-flex flex-column">
            <label className="filepath fs-5 fw-bold mt-2">File Path</label>
            <div className = 'd-flex'>
              <input
                type="text"
                name="filePath"
                className="mt-2"
                style={{ height: '40px', width : "-webkit-fill-available" }}
                value={filePath}
                onChange={handleFileInputChange}
                placeholder="Enter File Path"
              />
              <button onClick={handleFileAddButtonClick} style={{height: '40px', color : "white", backgroundColor : "#A31619", border:"none"}} className='mt-2'>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-plus" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
              </svg>
              </button>
            </div>
          </div>
          <div>
          {displayedfile.map((value, index) => (
                  <button key={index} type="button" class="close" aria-label="Close" onClick={handleRemoveFile}>
                    <span aria-hidden="true"> {value.replace(/^.*[\\/]/, '').replace(/\..*$/, '')} &times;</span>
                </button>
                ))}
          </div>

          {model === 'tabular' && (
            <>
              <div className="modelnameinput d-flex flex-column mt-2">
                <label className="modelname fs-5 fw-bold mt-2">Database Name</label>
                <input
                  type="text"
                  name="modelName"
                  className="mt-2"
                  style={{ height: '40px' }}
                  value={inputs.modelName}
                  onChange={handleInputChange}
                  placeholder="Enter Database Name"
                />
              </div>
              <div className="xmlaendpointinput d-flex flex-column mt-2">
                <label className="xmlaendpoint fs-5 fw-bold mt-2">Server Name</label>
                <input
                  type="text"
                  name="xmlaEndpoint"
                  className="mt-2"
                  style={{ height: '40px' }}
                  value={inputs.xmlaEndpoint}
                  onChange={handleInputChange}
                  placeholder="Enter Server Name"
                />
              </div>
            </>
          )}

          {model !== 'tabular' && (
            <>
              <div className="modelnameinput d-flex flex-column mt-2">
                <label className="modelname fs-5 fw-bold mt-2">Model Name</label>
                <input
                  type="text"
                  name="modelName"
                  className="mt-2"
                  style={{ height: '40px' }}
                  value={inputs.modelName}
                  onChange={handleInputChange}
                  placeholder="Enter Model Name"
                />
              </div>
              <div className="xmlaendpointinput d-flex flex-column mt-2">
                <label className="xmlaendpoint fs-5 fw-bold mt-2">XMLA Endpoint</label>
                <input
                  type="text"
                  name="xmlaEndpoint"
                  className="mt-2"
                  style={{ height: '40px' }}
                  value={inputs.xmlaEndpoint}
                  onChange={handleInputChange}
                  placeholder="Enter XMLA Endpoint"
                />
              </div>
            </>
          )}

          <div className="thresholdvalueinput d-flex flex-column mt-2">
            <label className="thresholdvalue fs-5 fw-bold mt-2">Threshold Value</label>
            <input
              type="text"
              name="thresholdValue"
              className="mt-2"
              style={{ height: '40px' }}
              value={inputs.thresholdValue}
              onChange={handleInputChange}
              placeholder="Enter Threshold Value"
            />
          </div>

          <div className="runningforfirsttimeinput d-flex mt-2">
            <label className="runningforfirsttime fs-5 fw-bold mt-2">Running for First Time</label>
            <input
              type="checkbox"
              name="runningForFirstTime"
              className="mt-3 mx-2"
              checked={inputs.runningForFirstTime}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="buttoncontainer container mt-4 mx-3 mb-5" style={{ width: '90%' }}>
          <div className="tabs d-flex justify-content-end">
            <div className="powerbimodel">
              <button type="button" className="resetbutton btn" onClick={() => handleResetClick()}>
              ↻ Reset
              </button>
            </div>
            <div className="tabularmodel mx-1">
              <button type="button" className="btn btn-danger analyzebutton" onClick={() => analyze()}>
                Analyze
              </button>
              {/* {popoverVisible ? ( */}
              {/* <div className="modal fade" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
              <div className="modal-dialog">
                <div className="modal-content">
                  {/* <div className="modal-header">
                    <h1 className="modal-title fs-5" id="staticBackdropLabel">Modal title</h1>
                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div> */}
              {/* <div className="modal-body">
                    <div className="progress" role="progressbar" aria-label="Basic example" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
                      <div className="progress-bar" style={{width: progress.progress + "%"}}></div>
                    </div>
                    {progress.result}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" className="btn btn-primary">Understood</button>
                  </div>
                </div>
              </div>
            </div> */}
              <Modal
                show={progresspopoverVisible}
                onHide={() => setprogressPopoverVisible(false)}
                backdrop="static"
                keyboard={false}
              >
                <Modal.Header closeButton>
                  <Modal.Title>Please wait while we analyze the data</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {
                    (progress.Total) === 0 ? <div className="modal-body">
                      <p>Generating column query data for analysis...</p>
                    </div> : <div className="modal-body d-flex flex-column justify-content-center">
                      <div className="progress" role="progressbar" aria-label="Basic example" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
                        <div className="progress-bar progress-bar-striped bg-danger progress-bar-animated" style={{ width: (progress.Progress / progress.Total) * 100 + "%" }}></div>
                      </div>
                      <div className='align-self-center'>
                        <b> <span style={{color : "#A31619"}}>
                         {parseInt((progress.Progress / progress.Total) * 100)}% </span> Completed</b>
                      </div>
                    </div>
                  }

                </Modal.Body>
              </Modal>




              <Modal
                show={popoverVisible}
                onHide={() => setPopoverVisible(false)}
                backdrop="static"
                keyboard={false}
              >
                <Modal.Header closeButton>
                  <Modal.Title>Login</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <div className="modal-body">
                    <div class="mb-3">
                      <label for="exampleInputEmail1" class="form-label">Email Address</label>
                      <input type="email" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp" onChange={handleemail} />
                      <div id="emailHelp" class="form-text">We'll never share your email with anyone else.</div>
                    </div>
                    <div class="mb-3">
                      <label for="exampleInputPassword1" class="form-label">Password</label>
                      <input type="password" class="form-control" id="exampleInputPassword1" onChange={handlepassword} />
                    </div>
                    <button type="submit" class="btn btn-primary" style={{backgroundColor : "#A31619"}} onClick={login} >Log In</button>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  {/* <Button variant="primary" onClick={handleClose}>
                  Close
                </Button> */}
                </Modal.Footer>
              </Modal>




              {/* 
              
              <form>
                
              </form>
              
              */}

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default InputComponent
