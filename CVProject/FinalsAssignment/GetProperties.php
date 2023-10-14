<html>
<body>

<?php
//GetProperties.php
//Returns a string with all the details
header("Content-Type: text/plain");

$img=$_GET["imgid"];

if ($img=="img1")
{
echo ("Cedar,Resists decay and insects,Lightweight");
}
else if ($img=="img2")
{
echo ("Fir,Cheap,Widely Available");
}
else if ($img=="img3")
{
echo ("Pine,Durable,Easy to Finish");
}
else if ($img=="img4")
{
echo ("Redwood,Moisture Resistant,Soft,Easy to work with");
}
else if ($img=="img5")
{
echo ("Ash,Durable,Hard,Strong");
}
else if ($img=="img6")
{
echo ("Birch,Cheap,Durable");
}
else if ($img=="img7")
{
echo ("Cherry,Dries quickly,Easy to process");
}
else if ($img=="img8")
{
echo ("Mahogany,Beautiful,Fine texture");
}

?>

</body>
</html>