
<?php


$a[]="dining chair";
$a[]="dining table";
$a[]="office desk";
$a[]="short bench";
$a[]="long bench";
$a[]="dresser";
$a[]="drawer";
$a[]="end table";
$a[]="floor cabinet";
$a[]="wall cabinet";
$a[]="bedframe";
$a[]="bed headboard";
$a[]="flower stand";



$q = $_GET["input"];

$hint="";

if ($q!=="")
{
$q= strtolower($q);
$len = strlen($q);

foreach ($a as $name){
	$pattern ='/' . $q . '/i';
	if (preg_match($pattern, $name))
	{
		if ($hint==""){
			$hint=$name;
		}
		else{
		$hint ="$hint,$name";
		}
	}



	}

}
echo $hint==""? "No valid products": $hint;





/*	$p=substr($name,0,$len);
//	$c=false;
//if (strstr($q, $p,$c))
//	{
//		if ($hint==""){
//			$hint=$name;
//		}
//		else{
//		$hint ="$hint,$name";
//		}	
//	}


//products
*/
?>




