import { useState } from 'react'
//import './App.css'

function App() {

  function displayExamples(input) {
    document.getElementById('Examples').innerHTML = ''
    if (input == 'UIDesign') {

      document.getElementById('Examples').innerHTML = '<div id=UIDesign></div><div id=UIText></div>';
      document.getElementById('UIDesign').innerHTML = '<iframe style="border: 1px solid rgba(0, 0, 0, 0.1);float:right;margin-left:10px" width="500" height="1000" src="https://www.figma.com/embed?embed_host=share&url=https%3A%2F%2Fwww.figma.com%2Fproto%2FvHRd2rFSbrHCOWYhcU7LEv%2FQE-App%3Fnode-id%3D13-8%26starting-point-node-id%3D13%3A8%26mode%3Ddesign%26t%3DZSk7Py5u25OnznfH-1" allowfullscreen></iframe>';

      document.getElementById('UIText').innerHTML = '<div><p>This is a high-fidelity prototype UI design for a mobile food ordering app. <br><br> Designed using Figma, this prototype simulates what the end-user would interact with and go through the process of using the app for its intended purpose, in this case ordering food.</p></div>';

    }
    else if (input == 'Webpage') {
      document.getElementById('Examples').innerHTML = '<p>Here is the front-end of a website I made to learn HTML, CSS, JS and PHP.</p><object type="text/html" data="src/assets/FinalsAssignment/HomePage.html" style="object-fit:contain;width:100%;height:1000px"></object>';
    }
    else if (input == 'Analyse') {
      document.getElementById('Examples').innerHTML = '<p>Raw Dataset found here: <a href="archive.ics.uci.edu/dataset/529/early+stage+diabetes+risk+prediction+data/"> Early Stage Diabetes Risk Prediction Dataset</a><br><br> Full report can be read from this <a href="https://docs.google.com/document/d/1xrk8EbClqNyVbGpnO0y5ip0V2DVDw0DN/edit?usp=sharing&ouid=111487749005686481730&rtpof=true&sd=true">link</a><br><br>Summary: Analysis of a Dataset filled with Patient Data to create a model to detect the onset of diabetes in their early stages through a number of associated symptoms. <br><br>Importance: Early diagnosis of diabetic patients can allow doctors to help their patients before they enter the late-stages of diabetes which is significantly more dangerous and life threatening.</p>';
    }
    else if (input == 'Database') {
      document.getElementById('Examples').innerHTML = '<div id="DatabaseImg"><img src="src/assets/AP ITEC 4220 Database Diagram.png" style="float:right;height:300px;"></img></div><div id="Databasetext"></div>';
      document.getElementById('Databasetext').innerHTML = '<div><p style="margin-right:10px">The Class Diagram of the final design of a University Database using object-relational database management principles.<br><br>Spool File of Logical Schema Code implemented in Oracle Database down below:</p><iframe src="src/assets/SpoolFile.txt" style="object-fit:contain;float:right;height:634px;width:99%"></iframe></div>';
    }
  }


  // <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js">
  //     $(document).ready(function){
  //         $(window).resize();
  //     }
  //     $(window).resize(function{
  //         var windowWidth=$(window).width();
  //         var mainContainerWidth=windowWidth-100;
  //         $("maincontainer").css({"width":mainCOntainerWidth+"px"});
  //     })

  // </script>


  return (
    <>
      <body>
        <div className="Home-Page-Background" style={{ whiteSpace: "nowrap", backgroundColor: "lightgrey", backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}>
          <div className="Home-Page-Main-Container" style={{width:"80%", marginLeft:"10%", marginRight:"10%"}}>
            <div className="Home-Page-Contact-Header" style={{
                padding: "10px",
                objectFit: "contain",
                height: "100px",
                overflow: "hidden"
                }}>
              <div className="Home-Page-Contact-Right" style={{float: "right"}}>
                <address>
                  <h1>Email: corey72he@gmail.com</h1>
                </address>
              </div>
              <div className="Home-Page-Primary-Contact-Left" style={{float: "left",}}>
                <h1>Preferred Contact: Email</h1>
              </div>
            </div>


            <article className="Main" style={{ marginLeft: "15%", marginRight: "15%", marginTop: "100px", width: "70%" }}>
              <div className="ImageHolder" style={{
                float: "right",
                width: "33%",
                borderStyle: "hidden",
                marginRight: "2%",
                marginTop: "2%"
              }}>
                <img src="person.jpg" alt="Default Avatar" style={{ width: "100%", objectFit: "fill" }} />
              </div>
              <div style={{ width: "100%" }}>
                <div style={{ margin: "auto", textAlign: "center" }}>
                  <div className="spacer" style={{ width: "33%", height: "40px", float: "right" }}></div>
                  <div style={{ backgroundColor: "white", borderStyle: "solid", width: "27%", marginLeft: "2%", overflow: "hidden" }}>
                    <h1>Corey He</h1>
                  </div>
                </div>
                <div style={{ backgroundColor: "white", borderStyle: "solid", width: "27%", height: "100px", marginLeft: "2%", overflow: "hidden" }}>
                  <div style={{ width: "100px", height: "100px", marginLeft: "10px", float: "left" }}>
                    <h2>Address: </h2>
                  </div>
                  <div style={{ marginLeft: "1%" }}>
                  <address>
                  <ul style={{ listStyle: "none", paddingTop: "10px", marginRight: "10px" }}>
                      <li>North York ON</li>
                      <li>M2J</li>
                      <li>Toronto</li>
                    </ul>
                    </address>
                  </div>
                </div>
              </div>


              <article className="Education"
                style={{ marginTop: "20px", marginLeft: "2%", borderStyle: "solid", width: "30%", height: "100px", backgroundColor: "white" }}>
                <div style={{ marginTop: "1px", marginLeft: "10px" }}>
                  <h2 style={{ marginTop: "4px", marginBottom: "1px", marginLeft: "1%", overflow: "hidden" }}>Education</h2>
                  <h4 style={{ marginTop: "1px", marginBottom: "1px", marginLeft: "1%", overflow: "hidden" }}>Information Technology, BA (Hons)
                  </h4>
                  <p style={{ marginTop: "10px", marginLeft: "1%", overflow: "hidden" }}>York University, Toronto</p>
                </div>
              </article>

              <article className="Personal Life"
                style={{ overflow: "hidden", width: "50%", marginTop: "10px", marginLeft: "2%", marginRight: "2%", borderStyle: "solid", backgroundColor: "white", padding: "10px" }}>
                <h2>Personal Life</h2>
                <p style={{ whiteSpace: "normal" }}>I am a graduate of York University. I graduated from their BA ITEC program with Honours. Before that, I
                  moved from Brampton to North York upon finishing high school. I have a wide variety of interests
                  ranging from astronomy to the human body, animation, art, and more.</p>
              </article>

              <article className="Skills"
                style={{ overflow: "hidden", marginTop: "25px", paddingLeft: "10px", paddingRight: "10px", marginLeft: "2%", marginRight: "2%", backgroundColor: "white", height: "150px", maxHeight: "150px", borderStyle: "solid" }}>
                <h2 style={{ paddingBottom: "0px", marginBottom: "0px" }}>Skills</h2>
                <div className="column1" style={{ float: "left", width: "33.33%", minWidth: "200px" }}>
                  <ul>
                    <li>Leadership</li>
                    <li>Communication</li>
                    <li>Time Management</li>
                    <li>Multitasking</li>
                  </ul>
                </div>
                <div className="column1" style={{ float: "left", width: "33.33%", minWidth: "200px" }}>
                  <ul>
                    <li>SDLC Knowledge</li>
                    <li>Technical Requirements</li>
                    <li>Business Requirements</li>
                    <li>UI and Graphics Requirements</li>
                  </ul>
                </div>
                <div className="column1" style={{ float: "left", width: "33.33%", minWidth: "200px" }}>
                  <ul>
                    <li>Systems Design</li>
                    <li>System Architecture</li>
                  </ul>
                </div>

              </article>


              <article className="Expertise"
                style={{ maxHeight: "350px", overflow: "hidden", marginTop: "20px", marginLeft: "2%", marginRight: "2%", padding: "10px", borderStyle: "solid", backgroundColor: "white" }}>
                <div className="Header">
                  <h1>Expertise</h1>
                </div>
                <div className="row" style={{ height: "250px" }}>
                  <div className="column2" style={{ float: "left", width: "33.33%", minWidth: "200px" }}>
                    <h2>Programmer</h2>
                    <p style={{ marginLeft: "10px" }}>Languages:</p>
                    <ul>
                      <li>Java</li>
                      <li>C#</li>
                      <li>Python</li>
                      <li>HTML</li>
                      <li>CSS</li>
                      <li>JS</li>
                      <li>SQL</li>
                      <li>XML</li>
                    </ul>
                  </div>
                  <div className="column2" style={{ float: "left", width: "33.33%", minWidth: "200px" }}>
                    <h2 style={{ marginBottom: "40px" }}>Data Analyst</h2>
                    <button type="button" id="data1" onclick="displayExamples('Analyse')">Diabetes
                      Dataset</button>
                  </div>
                  <div className="column2" style={{ float: "left", width: "33.33%", minWidth: "200px" }}>
                    <h2 style={{ marginBottom: "40px" }}>UI Designer</h2>
                    <button type="button" id="mobileUI1" onClick={() => displayExamples('UIDesign')}>Mobile App
                      Design</button>
                  </div>
                  <div className="column2" style={{ float: "left", width: "33.33%", minWidth: "200px" }}>
                    <h2 style={{ marginBottom: "40px" }}>Web Developer</h2>
                    <button type="button" id="webpage1" onClick={() => displayExamples('Webpage')}>Beginner
                      Webpage</button>
                  </div>
                  <div className="column2" style={{ float: "left", width: "33.33%", minWidth: "200px" }}>
                    <h2 style={{ marginBottom: "40px" }}>Database Admin</h2>
                    <button type="button" id="database1" onClick={() => displayExamples('Database')}>Database
                      Design</button>
                  </div>
                </div>
              </article>
              <article className="ExampleWork"
                style={{ whiteSpace: "normal", height: "1100px", borderStyle: "solid", backgroundColor: "white", marginTop: "50px", marginLeft: "2%", marginRight: "2%" }}>
                <h1 style={{ marginLeft: "10px" }}><u>Example Work</u></h1>

                <div id="Examples" style={{ paddingLeft: "10px", paddingRight: "10px", overflow: "hidden" }}>
                  <p>Examples of coding can be seen at my Github.</p>
                </div>
              </article>

              <article style={{ whiteSpace: "normal", height: "auto", borderStyle: "solid", backgroundColor: "white", marginTop: "50px", marginBottom: "100px", marginLeft: "2%", marginRight: "2%", padding: "10px" }}>
                <h2>Lorem Ipsum</h2>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent bibendum vulputate dolor, ut rhoncus nibh laoreet nec. Pellentesque in lorem libero. Quisque vitae ex vitae ligula porta auctor. Maecenas fermentum sit amet nisl vel elementum. Sed at varius libero. Aenean sagittis nisl massa, sit amet lobortis nunc mollis quis. Curabitur nunc augue, iaculis nec enim quis, blandit dapibus felis.
                  Maecenas ornare orci quis risus interdum tincidunt. Cras non nisl sollicitudin, facilisis risus pellentesque, tempor quam. Suspendisse potenti. Proin ac ligula elementum, sagittis nisl sed, tristique diam. Nulla facilisi. Ut consequat mauris sed sapien facilisis, vel malesuada quam mattis. Nullam nulla nisl, pellentesque non viverra quis, volutpat ut erat. Aenean in risus fringilla, fermentum massa pulvinar, pellentesque diam. Cras convallis nibh et diam porttitor, tristique pretium justo dignissim. Cras egestas hendrerit risus, eget tempor lacus feugiat elementum. Curabitur dictum ligula ac mi pellentesque condimentum. Donec pretium, odio ac rutrum accumsan, nibh lacus faucibus ante, sit amet facilisis ante dui vel elit. Proin tempus, dolor eu pharetra vehicula, augue mauris consequat elit, vitae aliquam sapien sem sed augue. Donec condimentum lacinia quam. Nulla ultricies est et accumsan euismod.
                </p>
              </article>

            </article>
          </div>
        </div>
      </body>
    </>
  )
}


export default App
