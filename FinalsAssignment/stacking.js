<!----//stacking


function movetofront(img){

	
	oldTop=document.getElementById("img1").style;
	oldTop.zIndex=1;
	oldTop.border="0px solid black";
	oldTop=document.getElementById("img2").style;
	oldTop.zIndex=1;
	oldTop.border="0px solid black";
	oldTop=document.getElementById("img3").style;
	oldTop.zIndex=1;
	oldTop.border="0px solid black";
	oldTop=document.getElementById("img4").style;
	oldTop.zIndex=1;
	oldTop.border="0px solid black";
	oldTop=document.getElementById("img5").style;
	oldTop.zIndex=1;
	oldTop.border="0px solid black";
	oldTop=document.getElementById("img6").style;
	oldTop.zIndex=1;
	oldTop.border="0px solid black";
	oldTop=document.getElementById("img7").style;
	oldTop.zIndex=1;
	oldTop.border="0px solid black";
	oldTop=document.getElementById("img8").style;
	oldTop.zIndex=1;
	oldTop.border="0px solid black";

	var newTop = document.getElementById(img).style;
	newTop.zIndex++;
	newTop.border="2px solid black";


	pList=document.getElementById("Properties");
	if(pList.hasChildNodes())
	{
	document.getElementById("Properties").innerHTML="";
	}
	getProperties();
}


	function getProperties(){

	var imgid=event.srcElement.id;
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function()
	{
		if(xhr.readyState==4&&xhr.status==200)
		{
		document.getElementById("Properties").innerHTML=xhr.responseText;
		var response=document.getElementById("Properties").innerHTML;
		document.getElementById("Properties").innerHTML="";
		const textres=response.split(",");
		
		document.getElementById("DProperties").innerHTML=textres[0]+" Properties:";
		
		for (var i=1;i<textres.length;i++)
		{
		var y =document.createElement("LI");
		var t= document.createTextNode(textres[i]);
		y.appendChild(t);
		document.getElementById("Properties").appendChild(y);
		}
		}
		
		
	}
	xhr.open("GET","http://localhost/FinalsAssignment/getProperties.php?imgid="+imgid,true);
	xhr.send();

	}



