
function getSuggestions(str)
{
	var input=str;
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function()
	{
		if(xhr.readyState==4&&xhr.status==200)
		{
		var c= document.getElementById("search").innerHTML=xhr.responseText;
		var response=c;
		c.innerHTML=input;
		var menuDOM=document.getElementById("suggestions");
		menuDOM.innerHTML="";
		textres = response.split(",");
		for (var i=0;i<textres.length;i++)
		{
			nextItem=new Option(textres[i]);
			try{
			menuDOM.append(nextItem);
			}
			catch(e){
			menuDOM.append(nextItem,null);
			}
			if (i>8)
			{
			}
	
		}
		}		
	}
	xhr.open("GET","http://localhost/FinalsAssignment/products.php?input="+input,true);
	xhr.send();
}
