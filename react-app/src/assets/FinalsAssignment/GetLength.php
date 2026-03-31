<html>
<body>

<?php
//GetLength.php
//Returns a string with all the available lengths
header("Content-Type: text/plain");

$woodtype=$_GET["woodtype"] ?? "";

if ($woodtype=="")
{
$woodtype="Cedar";
}




if($woodtype=="Cedar")
{
$size=["4 Feet","6 Feet","8 Feet","10 Feet","12 Feet","16 Feet","18 Feet"];
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Fir")
{
$size=["4 Feet","6 Feet","8 Feet","10 Feet","12 Feet","16 Feet","18 Feet"];
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Pine")
{
$size=["4 Feet","6 Feet","8 Feet"];
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Redwood")
{
$size=["4 Feet","6 Feet","8 Feet"];
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Ash")
{
$size=["4 Feet","6 Feet","8 Feet"];
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Birch")
{
$size=["4 Feet","6 Feet","8 Feet","10 Feet","12 Feet","16 Feet","18 Feet"];
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Cherry")
{
$size=["8 Feet","10 Feet","12 Feet","16 Feet"];
$myJSON=json_encode($size);
echo $myJSON;
}
else if($woodtype=="Mahogany")
{
$size=["8 Feet"];
$myJSON=json_encode($size);
echo $myJSON;
}


?>
</body>
</html>

