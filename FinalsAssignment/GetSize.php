<html>
<body>
<?php
//GetSize.php
//Returns the available sizes for the select

header("Content-Type: text/plain");

$woodtype=$_GET["woodtype"];


if($woodtype=="Cedar")
{
$size=["One-by-Two","One-by-Three","One-by-Four","One-by-Six","Two-by-Four","Two-by-Six","Two-by-Eight","Two-by-Ten"];
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Fir")
{
$size=array("One-by-Two","One-by-Three","One-by-Four","One-by-Six","Two-by-Four","Two-by-Six","Two-by-Eight");
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Pine")
{
$size=array("One-by-Two","One-by-Three","One-by-Four","One-by-Six","Two-by-Four","Two-by-Six");
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Redwood")
{
$size=array("One-by-Two","One-by-Three","One-by-Four","Two-by-Four",);
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Ash")
{
$size=array("One-by-Two","One-by-Three","One-by-Four","One-by-Six","Two-by-Four","Two-by-Six","Two-by-Eight");
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Birch")
{
$size=array("One-by-Two","One-by-Three","One-by-Four","Two-by-Four");
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Cherry")
{
$size=array("One-by-Two","One-by-Three","One-by-Four","Two-by-Four","Two-by-Eight","Two-by-Ten");
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Mahogany")
{
$size=array("Two-by-Four");
$myJSON=json_encode($size);
echo $myJSON;
}







?>

</body>
</html>
