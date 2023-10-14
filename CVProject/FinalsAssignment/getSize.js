

function getSize(){

	var woodtype=document.getElementById("Type").value;
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function()
	{
		if(xhr.readyState==4&&xhr.status==200)
		{
		document.getElementById("DSizes").innerHTML=xhr.responseText;
		var response=document.getElementById("DSizes").innerHTML;
		var text=response.toString();
		text=text.substr(3,text.length);
		text=text.substr(0,text.length-4);
		text=text.replace(/"/g,"");
		
		document.getElementById("DSizes").innerHTML="Available Sizes";
		const textres=text.split(",");
		var menuDOM=document.getElementById("Sizes");
		menuDOM.options.length=0;

		for (var i=0;i<textres.length;i++)
		{
		nextItem=new Option(textres[i]);
			try{
			menuDOM.add(nextItem);
			}
			catch (e){
			menuDOM.add(nextItem,null);
			}
		}

		}
		
	}
	xhr.open("GET","http://localhost/FinalsAssignment/GetSize.php?woodtype="+woodtype,true);
	xhr.send();

	getLength();


}


function getLength()
{
	var woodtype=document.getElementById("Type").value;
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function()
	{
		if(xhr.readyState==4&&xhr.status==200)
		{
		document.getElementById("DLengths").innerHTML=xhr.responseText;
		var response=document.getElementById("DLengths").innerHTML;
		var text=response.toString();
		text=text.substr(4,text.length);
		text=text.substr(0,text.length-4);
		text=text.replace(/"/g,"");
		
		document.getElementById("DLengths").innerHTML="Available Length";
		const textres=text.split(",");
		var menuDOM=document.getElementById("Lengths");
		menuDOM.options.length=0;

		for (var i=0;i<textres.length;i++)
		{
		nextItem=new Option(textres[i]);
			try{
			menuDOM.add(nextItem);
			}
			catch (e){
			menuDOM.add(nextItem,null);
			}
		}

		}
		
	}
	xhr.open("GET","http://localhost/FinalsAssignment/GetLength.php?woodtype="+woodtype,true);
	xhr.send();



}