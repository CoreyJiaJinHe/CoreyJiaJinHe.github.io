<html>
<body>

<?php
header('Access-Control-Allow-Origin: *');
$id=$_GET["id"];
$ids=explode(",",$id);
$accusername=array("admin","test","12345","CC");
$accpassword=array("password","test","12345","Password123*");
$invalid=False;
$uname=$ids[0];
$upass=$ids[1];
for ($i =0 ; $i<count($accusername);$i++)
{
	if($uname==$accusername[$i]){
		if($upass==$accpassword[$i]){
		$i=count($accusername);
		$invalid=False;
		}
		else {$invalid=True;}
	}
	else {$invalid=True;}
}
	if($invalid==True)
	{
	echo("false");
	}
	else{
	echo("true");
	}
?>




</body>
</html>