
function checkCookie()
{
	let username=getCookie("username");
	if (username!= ""){
	document.getElementById("login").disabled=true;
	document.getElementById("login").innerHTML="Welcome,"+username;
	}
	else{
	}
}
function getCookie(cname)
{
	let name=cname+"=";
	let decodedCookie =decodeURIComponent(document.cookie);
	let ca =decodedCookie.split(';');
	for (let i=0; i<ca.length;i++){
		let c = ca[i];
		while (c.charAt(0)==' '){
			c=c.substring(1);
		}
		if (c.indexOf(name)==0){
				return c.substring(name.length,c.length);
		}
	}	
	return "";
}


