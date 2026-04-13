function DatabaseExample() {
	const databaseDiagramSrc = new URL('../AP ITEC 4220 Database Diagram.png', import.meta.url).href
	const spoolFileSrc = new URL('../SpoolFile.txt', import.meta.url).href

	return (
		<>
			<div>
				<img src={databaseDiagramSrc} style={{ float: 'right', height: '300px' }} alt="Database diagram" />
			</div>
			<div>
				<p style={{ marginRight: '10px' }}>
					The Class Diagram of the final design of a University Database using object-relational database management principles.
					<br /><br />
					Spool File of Logical Schema Code implemented in Oracle Database down below:
				</p>
				<iframe src={spoolFileSrc} style={{ objectFit: 'contain', float: 'right', height: '634px', width: '99%' }} title="Spool file" />
			</div>
		</>
	)
}

export default DatabaseExample
