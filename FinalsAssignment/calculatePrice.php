<html>
<body>



<?php
//calculatePrice.php
//Returns a string with the price
header("Content-Type: text/plain");


$data=$_GET["data"];
$dat=explode(',' , $data);





$woodtype=$dat[0];
$size=$dat[1];
$length=$dat[2];
$quantity=$dat[3];




$woodtypeprice=0;
if($woodtype=="Cedar")
{
$woodtypeprice=10;
}
else if($woodtype=="Fir")
{
$woodtypeprice=20;
}
else if($woodtype=="Pine")
{
$woodtypeprice=20;
}
else if($woodtype=="Redwood")
{
$woodtypeprice=30;
}
else if($woodtype=="Ash")
{
$woodtypeprice=80;
}
else if($woodtype=="Birch")
{
$woodtypeprice=30;
}
else if($woodtype=="Cherry")
{
$woodtypeprice=50;
}
else if($woodtype=="Mahogany")
{
$woodtypeprice=100;
}




$sizeprice=0;

if($size=="One-by-Two")
{
$sizeprice=1;
}
else if($size=="One-by-Three")
{
$sizeprice=1.1;
}
else if($size=="One-by-Four")
{
$sizeprice=1.2;
}
else if($size=="One-by-Six")
{
$sizeprice=1.5;
}
else if($size=="Two-by-Four")
{
$sizeprice=2;
}
else if($size=="Two-by-Six")
{
$sizeprice=2.2;
}
else if($size=="Two-by-Eight")
{
$sizeprice=2.3;
}
else if($size=="Two-by-Ten")
{
$sizeprice=2.4;
}



$lengthprice=0;

if($length=="4 Feet")
{
$lengthprice=1;
}
else if($length=="6 Feet")
{
$lengthprice=1.3;
}
else if($length=="8 Feet")
{
$lengthprice=1.5;
}
else if($length=="10 Feet")
{
$lengthprice=2;
}
else if($length=="12 Feet")
{
$lengthprice=2.2;
}
else if($length=="14 Feet")
{
$lengthprice=2.4;
}
else if($length=="16 Feet")
{
$lengthprice=2.6;
}
else if($length=="18 Feet")
{
$lengthprice=2.8;

}

$price=$woodtypeprice * $sizeprice * $lengthprice * $quantity;

echo "$price";



?>
</body>
</html>
