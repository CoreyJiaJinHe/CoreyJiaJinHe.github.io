import { useEffect, useState } from 'react'
import './Home.css'
import ToggleableSwitchComponent from './components/ToggleComponent'
function App() {
  const [activeProject, setActiveProject] = useState('')
  const [hoveredProject, setHoveredProject] = useState('')
  const [nightMode, setNightMode] = useState(false)
  const [isLeftBarOpen, setIsLeftBarOpen] = useState(false)

  const getProjectHeadingStyle = (projectKey) => {
    const isHovered = hoveredProject === projectKey
    const isActive = activeProject === projectKey

    return {
      marginBottom: "8px",
      cursor: "pointer",
      textDecoration: "underline",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      lineHeight: "1.25",
      color: isActive ? "#0b5ed7" : isHovered ? "#0a7a2f" : "#1f2937",
      backgroundColor: isActive ? "#dbeafe" : isHovered ? "#dcfce7" : "transparent",
      border: isActive || isHovered ? "1px solid #9ca3af" : "1px solid transparent",
      borderRadius: "8px",
      padding: "8px",
      transition: "all 150ms ease"
    }
  }

  const handleProjectSelect = (projectKey, inputKey) => {
    setActiveProject(projectKey)
    displayExamples(inputKey)
  }

  const handleProjectLeave = (projectKey) => {
    setHoveredProject('')
    setActiveProject((current) => (current === projectKey ? '' : current))
  }

  useEffect(() => {
    document.body.style.backgroundColor = nightMode ? "#1f2937" : "lightgrey"
    document.body.style.color = nightMode ? "#f3f4f6" : "#1f2937"
  }, [nightMode])

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
        <div className={`Home-Page-Background ${nightMode ? 'Home-Page-Background--night' : 'Home-Page-Background--day'}`}>
          <div className="Left-Bar" style={{
            position: "fixed",
            top: "16px",
            left: "0",
            width: "150px",
            backgroundColor: nightMode ? "#111827" : "#e5e7eb",
            display: "flex",
            alignItems: "center",
            padding: "16px",
            border: "1px solid #9ca3af",
            borderLeft: "none",
            borderRadius: "0 12px 12px 0",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
            zIndex: "1000",
            transform: isLeftBarOpen ? "translateX(0)" : "translateX(calc(-100% + 20px))",
            transition: "transform 220ms ease"
          }}>
            <button className ="Left-Bar-Toggle-Button"
              type="button"
              aria-label={isLeftBarOpen ? "Close left bar" : "Open left bar"}
              onClick={() => setIsLeftBarOpen((current) => !current)}
              style={{
                position: "absolute",
                top: "16px",
                right: "-18px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "1px solid #6b7280",
                backgroundColor: nightMode ? "#0f172a" : "#ffffff",
                color: nightMode ? "#f9fafb" : "#1f2937",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "bold",
                lineHeight: "1"
              }}
            >
              {isLeftBarOpen ? "\u00d7" : "\u2630"}
            </button>
            <div className="Component-Night-Mode-Toggle">
              <ToggleableSwitchComponent setNightMode={setNightMode} nightMode={nightMode} />
            </div>
          </div>
          <div className="Home-Page-Contact-Header">
            <div className="Home-Page-Contact-Right">
              <address>
                <h1>Email: corey72he@gmail.com</h1>
              </address>
            </div>
            <div className="Home-Page-Primary-Contact-Left">
              <h1>Preferred Contact: Email</h1>
            </div>
          </div>
          <div className="Home-Page-Main-Container">
            <article className="Home-Page-Main-Content">
              <div className="Home-Page-Portrait-Image">
                <img src="person.jpg" alt="Default Avatar" className="Home-Page-Portrait-Image-Img" />
              </div>
              <article id="Home-Page-Personal-Details" className="Home-Page-Article Home-Page-Article--personal-details">
                <div className ="layout-generic-panel">
                  <h1>Corey He</h1>
                </div>
                <div className ="layout-generic-panel layout-generic-panel--two">
                  <h2>Address: </h2>
                  <address>
                    <ul style={{
                      listStyle: "none",
                      marginTop: "0", paddingLeft: "0"
                    }}>
                      <li>North York, ON</li>
                      <li>M2J</li>
                      <li>Toronto</li>
                    </ul>
                  </address>
                </div>
              </article>

              <article id="Home-Page-Education" className="Home-Page-Article Home-Page-Article--education">
                <div style={{ overflow: "hidden" }}>
                  <h2 style={{ marginTop: "4px", marginBottom: "1px" }}>Education</h2>
                  <h4 style={{ marginTop: "1px", marginBottom: "1px" }}>Information Technology, BA (Hons)</h4>
                  <p style={{ marginTop: "10px", overflow: "hidden" }}>York University, Toronto</p>
                </div>
              </article>

              <article id="Home-Page-Personal-Life" className="Home-Page-Article Home-Page-Article--personal-life">
                <h2>About Me</h2>
                <p style={{ whiteSpace: "normal" }}>Detail-oriented IT graduate with hands-on experience building full-stack
                  web applications and desktop software using Python, FastAPI, React, and MongoDB.
                  Experienced in database design, API development, and software testing.
                  Strong problem-solving skills with a focus on system reliability, data integrity, and user experience.
                  Seeking an entry-level IT or software development role to contribute technical and analytical skills.</p>
              </article>

              <article id="Home-Page-Skills" className="Home-Page-Article Home-Page-Article--skills">
                <h2 style={{ paddingBottom: "0px", marginBottom: "0px" }}>Skills</h2>
                <div className="layout-row-skills">
                  <div className="layout-column-skills">
                    <ul>
                      <li>Leadership</li>
                      <li>Communication</li>
                      <li>Time Management</li>
                      <li>Multitasking</li>
                    </ul>
                  </div>
                  <div className="layout-column-skills">
                    <ul>
                      <li>Problem Solving</li>
                      <li>Critical Thinking</li>
                      <li>Adaptability</li>
                      <li>Quick Learner</li>
                    </ul>
                  </div>
                  <div className="layout-column-skills">
                    <ul>
                      <li>SDLC Knowledge</li>
                      <li>Technical Requirements</li>
                      <li>Business Requirements</li>
                      <li>UI and Graphics Requirements</li>
                    </ul>
                  </div>
                  <div className="layout-column-skills">
                    <ul>
                      <li>Systems Design</li>
                      <li>System Architecture</li>
                      <li>Database Design</li>
                      <li>Software Testing</li>
                    </ul>
                  </div>
                  <div className="layout-column-skills">
                    <ul>
                      <li>Software Development</li>
                      <li>Web Development</li>
                      <li>Desktop Software Development</li>
                      <li>API Development</li>
                    </ul>
                  </div>
                  <div className="layout-column-skills">
                    <ul>
                      <li>Version Control</li>
                      <li>Git</li>
                      <li>GitHub</li>
                      <li>CI/CD</li>
                    </ul>
                  </div>
                  <div className="layout-column-skills">
                    <ul>
                      <li>AI Prompt Engineering</li>
                      <li>AI Code Generation</li>
                    </ul>
                  </div>
                </div>
              </article>


              <article id="Home-Page-Expertise" className="Home-Page-Article Home-Page-Article--panel">
                <div className="Header">
                  <h1>Expertise</h1>
                </div>
                <h2>Programmer</h2>
                <div className="layout-row-expertise">
                  <div className="layout-section">
                    <p style={{ marginLeft: "10px" }}>Languages:</p>
                    <ul>
                      <li>Java</li>
                      <li>JS/JavaScript</li>
                      <li>Python</li>
                      <li>JS</li>
                      <li>SQL</li>
                      <li>XML</li>
                    </ul>
                  </div>
                  <div className="layout-section">
                    <p style={{ marginLeft: "10px" }}>Web Technologies:</p>
                    <ul>
                      <li>HTML</li>
                      <li>CSS</li>
                      <li>PHP</li>
                      <li>AJAX</li>
                      <li>JSON</li>
                      <li>REST APIs</li>
                      <li>VITE</li>
                    </ul>
                  </div>
                  <div className="layout-section">
                    <p style={{ marginLeft: "10px" }}>Frameworks and Libraries:</p>
                    <ul>
                      <li>React</li>
                      <li>FastAPI</li>
                      <li>Flask</li>
                      <li>PyQt</li>
                      <li>AJAX</li>
                      <li>SKLearn</li>
                      <li>Matplotlib</li>
                    </ul>
                  </div>
                  <div className="layout-section" >
                    <p style={{ marginLeft: "10px" }}>Databases:</p>
                    <ul>
                      <li>MongoDB</li>
                      <li>PostgreSQL</li>
                    </ul>
                  </div>
                </div>
              </article>
              <article id="Home-Page-School-Projects" className="Home-Page-Article Home-Page-Article--panel">
                <div>
                  <h1>School Projects</h1>
                  <p>Click the headings to open the project details.</p>
                  <div className="layout-row-projects">

                    <div className="layout-column-project">
                      <h2
                        role="button"
                        tabIndex={0}
                        onClick={() => handleProjectSelect('analyse', 'Analyse')}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleProjectSelect('analyse', 'Analyse')}
                        onMouseEnter={() => setHoveredProject('analyse')}
                        onMouseLeave={() => handleProjectLeave('analyse')}
                        style={getProjectHeadingStyle('analyse')}
                      >
                        Data Analyst: Diabetes Risk Prediction
                      </h2>
                    </div>
                    <div className="layout-column-project">
                      <h2
                        role="button"
                        tabIndex={0}
                        onClick={() => handleProjectSelect('uidesign', 'UIDesign')}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleProjectSelect('uidesign', 'UIDesign')}
                        onMouseEnter={() => setHoveredProject('uidesign')}
                        onMouseLeave={() => handleProjectLeave('uidesign')}
                        style={getProjectHeadingStyle('uidesign')}
                      >
                        UI Designer: Mobile App Design
                      </h2>
                    </div>
                    <div className="layout-column-project">
                      <h2
                        role="button"
                        tabIndex={0}
                        onClick={() => handleProjectSelect('webpage', 'Webpage')}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleProjectSelect('webpage', 'Webpage')}
                        onMouseEnter={() => setHoveredProject('webpage')}
                        onMouseLeave={() => handleProjectLeave('webpage')}
                        style={getProjectHeadingStyle('webpage')}
                      >
                        Web Developer: Beginner Commerce Webpage
                      </h2>
                    </div>
                    <div className="layout-column-project">
                      <h2
                        role="button"
                        tabIndex={0}
                        onClick={() => handleProjectSelect('database', 'Database')}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleProjectSelect('database', 'Database')}
                        onMouseEnter={() => setHoveredProject('database')}
                        onMouseLeave={() => handleProjectLeave('database')}
                        style={getProjectHeadingStyle('database')}
                      >
                        Database Admin: University Database Design
                      </h2>
                    </div>
                  </div>
                </div>
              </article>
              <article id="Home-Page-Personal-Projects" className="Home-Page-Article Home-Page-Article--panel">
                <h1>Personal Projects</h1>
              </article>
              <article id="Home-Page-Example-Work" className="Home-Page-Article Home-Page-Article--example-work">
                <h1 style={{ marginLeft: "10px" }}><u>Example Work</u></h1>

                <div style={{ paddingLeft: "10px", paddingRight: "10px", overflow: "hidden" }}>
                  <p>More examples of my work can be seen at my Github.</p>
                </div>
              </article>

                <article id="Home-Page-Afterword" className="Home-Page-Article Home-Page-Article--afterword">
                <h2>Afterword</h2>
                <p>
                  Thank you for taking the time to review my portfolio.
                  I am excited about the opportunity to contribute my skills and passion for technology to a dynamic team.
                  I am eager to continue learning and growing as a professional, and I look forward to the possibility of working together in the future.
                  Please feel free to reach out if you have any questions or would like to discuss potential opportunities.
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
