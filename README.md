# Portfolio Website

This project is my personal portfolio website built with React and Vite.

It showcases work from university courses and self-directed learning, including:

- UI and product design examples
- data analysis projects
- a workshop-style web application flow
- an interactive university database diagram with custom relationship rendering

## Purpose

The goal of this portfolio is to present both technical and design capabilities in one place:

- software and web development
- database modeling and relationship visualization
- data and analytics work
- user interface and interaction design

## Tech Stack

- React
- Vite
- React Flow (XYFlow)
- JavaScript (ES modules)
- CSS

## Main Highlights

### Home Portfolio Experience

- Responsive personal portfolio layout
- Night mode and interactive side panel controls
- Project sections that open example content directly inside the app

### Database Diagram Experience

- Interactive entity relationship visualization
- Custom edge component with:
	- marker rendering
	- cardinality labels
	- dynamic edge connection points on table boundaries
- Configurable table node coordinates for layout tuning
- Refactored modular database code under the Database assets folder

### Workshop Pages

- Home, login, and product page style previews
- Demonstrates multi-page flow and UI structure

## Project Structure

Key folders:

- src
	- assets
		- examples
			- DatabaseExample.jsx
			- UIDesignExample.jsx
			- AnalyseExample.jsx
		- Database
			- constants.js
			- TableNode.jsx
			- RelationshipEdge.jsx
			- databaseData.jsx
		- Workshop
	- components
	- Home.jsx

## Notes

- This repository is actively evolving as I continue improving project quality, architecture, and presentation.
- The database example has been modularized to keep diagram data, edge rendering logic, and node components separated and easier to maintain.

## Author

Corey He

Preferred contact: Email

If you are reviewing this for internship or entry-level opportunities, thank you for your time.
