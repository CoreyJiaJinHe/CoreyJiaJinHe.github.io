import { useEffect, useState } from 'react'
import './Home.css'
import LeftBar from './components/LeftBar'
import WoodWorkshopWrapper from './components/WoodWorkshopWrapper.jsx'
import LoginPage from './assets/Workshop/LoginPage.jsx'
import ProductPage from './assets/Workshop/productpage.jsx'
import HomePage from './assets/Workshop/homepage.jsx'
import UIDesignExample from './assets/examples/UIDesignExample.jsx'
import AnalyseExample from './assets/examples/AnalyseExample.jsx'
import DatabaseExample from './assets/examples/DatabaseExample.jsx'

function App() {
  const [activeProject, setActiveProject] = useState('')
  const [hoveredProject, setHoveredProject] = useState('')
  const [nightMode, setNightMode] = useState(false)
  const [isLeftBarOpen, setIsLeftBarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showLoginPreview, setShowLoginPreview] = useState(false)
  const [selectedExample, setSelectedExample] = useState('none') // 'none' | 'uidesign' | 'analyse' | 'database'
  const [previewMode, setPreviewMode] = useState('none') // 'none' | 'home' | 'login' | 'product' | 'furniture'

  const getProjectHeadingStyle = (projectKey) => {
    const isHovered = hoveredProject === projectKey
    const isActive = activeProject === projectKey

    const defaultTextColor = nightMode ? "#e5e7eb" : "#1f2937"
    const hoverTextColor = nightMode ? "#86efac" : "#0a7a2f"
    const activeTextColor = nightMode ? "#93c5fd" : "#0b5ed7"
    const hoverBackground = nightMode ? "#1f3a2a" : "#dcfce7"
    const activeBackground = nightMode ? "#1e3a5f" : "#dbeafe"
    const borderColor = nightMode ? "#6b7280" : "#9ca3af"

    return {
      marginBottom: "8px",
      cursor: "pointer",
      textDecoration: "underline",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      lineHeight: "1.25",
      color: isActive ? activeTextColor : isHovered ? hoverTextColor : defaultTextColor,
      backgroundColor: isActive ? activeBackground : isHovered ? hoverBackground : "transparent",
      border: isActive || isHovered ? `1px solid ${borderColor}` : "1px solid transparent",
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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const updateIsMobile = (event) => {
      setIsMobile(event.matches)
    }

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', updateIsMobile)

    return () => {
      mediaQuery.removeEventListener('change', updateIsMobile)
    }
  }, [])

  function displayExamples(input) {
    setShowLoginPreview(false)
    setSelectedExample('none')
    setPreviewMode('none')

    if (input === 'UIDesign') {
      setSelectedExample('uidesign')
    } else if (input === 'Webpage') {
      setShowLoginPreview(true)
      setPreviewMode('home')
    } else if (input === 'Analyse') {
      setSelectedExample('analyse')
    } else if (input === 'Database') {
      setSelectedExample('database')
    }
  }

  return (
    <>
      <div className={`Home-Page-Background ${nightMode ? 'Home-Page-Background--night' : 'Home-Page-Background--day'} ${isMobile ? 'Home-Page--mobile' : ''}`}>
          <LeftBar isLeftBarOpen={isLeftBarOpen} setIsLeftBarOpen={setIsLeftBarOpen} nightMode={nightMode} setNightMode={setNightMode} />
          <div className="Home-Page-Contact-Header">
            <div className="Home-Page-Primary-Contact-Left">
              <h1>Preferred Contact: Email</h1>
            </div>
            <div className="Home-Page-Contact-Right">
              <address>
                <h1>Email: corey72he@gmail.com</h1>
              </address>
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
                  <h2 style={{ marginTop: "4px", marginBottom: "1px" }}>Education</h2>
                  <h4 style={{ marginTop: "1px", marginBottom: "1px" }}>Information Technology, BA (Hons)</h4>
                  <p style={{ marginTop: "10px", overflow: "hidden" }}>York University, Toronto</p>
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
                  {!showLoginPreview && selectedExample === 'none' && <p>More examples of my work can be seen at my Github.</p>}
                  {selectedExample === 'uidesign' && <UIDesignExample />}
                  {selectedExample === 'analyse' && <AnalyseExample />}
                  {selectedExample === 'database' && <DatabaseExample />}
                  {showLoginPreview && previewMode === 'home' && (
                    <WoodWorkshopWrapper onNavigate={setPreviewMode}>
                      <HomePage onNavigate={setPreviewMode} />
                    </WoodWorkshopWrapper>
                  )}
                  {showLoginPreview && previewMode === 'login' && (
                    <WoodWorkshopWrapper onNavigate={setPreviewMode} contentStyle={{ height: '500px', border: '2px solid black' }}>
                      {({ backendAvailable, setNavbarLoginState }) => (
                        <LoginPage
                          backendAvailable={backendAvailable}
                          onNavbarLoginStateChange={setNavbarLoginState}
                        />
                      )}
                    </WoodWorkshopWrapper>
                  )}
                  {showLoginPreview && previewMode === 'product' && (
                    <WoodWorkshopWrapper onNavigate={setPreviewMode}>
                      {({ backendAvailable }) => (
                        <ProductPage onNavigate={setPreviewMode} backendAvailable={backendAvailable} />
                      )}
                    </WoodWorkshopWrapper>
                  )}
                  {showLoginPreview && previewMode === 'furniture' && (
                    <WoodWorkshopWrapper onNavigate={setPreviewMode}>
                      <div style={{ margin: '20px' }}>
                        <h1>Furniture</h1>
                        <p>This section is not implemented yet. Use the navigation buttons above to continue.</p>
                      </div>
                    </WoodWorkshopWrapper>
                  )}
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
    </>
  )
}


export default App
