
function calculatePrice(){
	
	document.getElementById("addtocart").disabled=false;
	document.getElementById("qStatus").innerHTML="";
	var quant=document.getElementById("Quantity").value;
	if (quant>30)
	{
	document.getElementById("addtocart").disabled=true;
	document.getElementById("qStatus").innerHTML="Too much!";
	}
	else if(quant < 1)
	{
	document.getElementById("addtocart").disabled=true;
	document.getElementById("qStatus").innerHTML="Invalid input!";
	}
	else{
	
	var data=document.getElementById("Type").value+","+document.getElementById("Sizes").value+","+document.getElementById("Lengths").value+","+document.getElementById("Quantity").value;
	console.log(data);
	
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function()
	{
		if(xhr.readyState==4&&xhr.status==200)
		{
		document.getElementById("cost").innerHTML=xhr.responseText;
		var response=document.getElementById("cost").innerHTML;
		var cost=parseFloat(response);
		document.getElementById("cost").innerHTML="$ "+cost;
			
		}		
	}
	xhr.open("GET","http://localhost/FinalsAssignment/CalculatePrice.php?data="+data,true);
	xhr.send();
	

	
	}



}