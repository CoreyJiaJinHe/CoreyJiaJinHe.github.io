

function addtocart()
	{
	var item=document.getElementById("Lengths").value+" "+document.getElementById("Sizes").value+" "+document.getElementById("Type").value+" Plank x"+document.getElementById("Quantity").value+" "+document.getElementById("cost").innerHTML+".00";
	
	console.log(item);
		var y =document.createElement("LI");
		var t= document.createTextNode(item);
		y.appendChild(t);
		document.getElementById("cart").appendChild(y);
	}

function viewcart()
{
	var x=document.getElementById("cartdiv");
	
	if(x.style.visibility=="visible")
	{
	x.style.visibility="hidden";
	}
	else if(x.style.visibility=="hidden")
	{
	x.style.visibility="visible";
	}
}

function clearcart()
{
	document.getElementById("cart").innerHTML="";
}
