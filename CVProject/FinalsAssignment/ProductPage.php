<!DOCTYPE html>
<html>
<title>Oasis Woodworks</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="mycssv2.css">
<head>

<style>

.header
{
margin-left:auto;
margin-right:auto;
background-color:teal;
width:1000px;
}
.namebar
{
width:100%;
min-width:900px;
text-align:center;
background-color:teal;
height:120px;
display:inline-block;
}

.navbar{
font-size:16px;
background-color:black;
width:100%;
min-width:900px;
}
.content{
background-color:white;
margin-left:auto;
margin-right:auto;
width:1000px;
padding-top:10px;


}

.content2{
background-color:lightblue;
border:2px solid black;
}


#footer
{
background-color:teal;
color:white;
height:auto;
text-color:white;
left: 0;
bottom: 0;
width: 100%;
margin-left:auto;
margin-right:auto;
width:1000px;
}
table.footer{
margin-left:auto;
margin-right:auto;
padding-top:20px;
padding-bottom:20px;
}
td.footer
{
font-size:20px;
padding:10px;
padding-right:auto;
padding-left:auto;
}

.button1 {
  background-color: white; 
  color: black; 
  border: 2px solid #F0F0F0;
font-size:16px;
}

.button1:hover {
  background-color: #A9A9A9;
  color: white;
}
</style>
</head>



<body style="background-color:black;">
<?php

header('Access-Control-Allow-Origin: *');

?>


<div class="header">
	<div class="namebar">
	<img src="Images/img_saw.png" alt="Image of Logo" style="float:left;height:120px;width:120px;object-fit:contain">
	<img src="Images/img_saw.png" alt="Image of Logo" style="float:right;height:120px;width:120px;object-fit:contain">
		<div style="color:white;font-size:30px;">
		<h1>Oasis Woodworks</h1>
		</div>
	</div>
	<div style="background-color:white;width:100%;height:10px">
	</div>

	<div style="padding-top:10px;padding-bottom:10px;background-color:black;height:25px;"
	<div class="navbar">
	<input type="search" value="Search" style="width:15%;min-width:165px;"/>
	<button type="submit" style="width:5%;min-width:160px;">Submit</button>
	<button onclick="location.href='HomePage.html'" style="width:auto%;min-width:160px;" class="button button1">Home Page </button>
	<button onclick="location.href='ProductPage.html'"style="width:auto%;min-width:165px;" class="button button1">Finished Wood</button>
	<button onclick="location.href='ErrorPage.html'"style="width:auto%;min-width:165px;" class="button button1">Furniture</button>
	<button onclick="location.href='login.html'"style="width:auto;min-width:165px;" class="button button1">Login</button>
	</div>
	</div>
</div>

<div class="content">
<p style="font-size:20px"> We sell a variety of wood at Beaver's Woodshop. We have Cedar, Fir, Pine, Redwood, Ash, Birch, Cherry and Mahogany for sale. The wood will come processed at industry standards.
<br><br>
We offer various sizes. <img src="Images/img_lumbersizes.png" alt="Picture of Lumber Sizes" style="float:right;object-fit:contain;width:40%;height:40%;max-width:100%;max-height:100%"/>
<br>
<br>Two-by-Four
<br>Two-by-Six
<br>Two-by-Eight
<br>Two-by-Ten
<br>One-by-Two
<br>One-by-Three
<br>One-by-Four
<br>One-by-Six
<br><br>
The standard length is 12 feet long. But the length can be customized.

</p>


<div>
<p><b>What type of wood would you like?</b></p>
<form action="addtocart">
<p>
<select name="Types of Wood">
<option>Cedar</option>
<option>Fir</option>
<option>Pine</option>
<option>Redwood</option>
<option>Ash</option>
<option>Birch</option>
<option>Cherry</option>
<option>Mahogany</option>
</select>
</p>
</form>
</div>
<div>
<form action="size">
	<table>
	<tr>
	<th><label><input type="radio" name="size" checked="checked"/> 1x2</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 1x3</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 1x4</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 1x6</label> </th>
	</tr>
	<tr>
	<th><label><input type="radio" name="size" checked="checked"/> 2x4</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 2x6</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 2x8</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 2x10</label> </th>
	</tr>
</table>
</form>
</div>
<div>
<p><b>How long would you like the pieces to be?"</b></p>
<form action="length">
<table style="text-align:left">
	<tr>
	<th><label><input type="radio" name="size" checked="checked"/> 6 Feet</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 8 Feet</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 10 Feet</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 12 Feet</label> </th>
	</tr>
	<tr>
	<th><label><input type="radio" name="size" checked="checked"/> 16 Feet</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 18 Feet</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 20 Feet</label> </th>
	<th><label><input type="radio" name="size" checked="checked"/> 24 Feet</label> </th>
	</tr>
</table>
	</form>
<p><b> Number of pieces?</b>
<form action="quantity">
	<label> Quantity:<input type = "text" name="Quantity" size = "4" max length="4"/>
	</label></form>
	</p>
	</div>
	<div>
	<p>
	<label><input type = "submit" value = "Add to Cart"/></label>
	<label><input type = "submit" value = "View Cart"/></label>
	</p>
	</div>
</div>
</div>





</div>
<div id="footer">
<table class="footer">
<tr>
<td class="footer"><label><a href="A1ErrorPage.html">FAQ</a></label></td>
<td class="footer"><label><a href="A1ErrorPage.html">Support</a></label></td>
<td class="footer"><label><a href="A1ErrorPage.html">Contact Us</a></label></td>
</tr>
<tr>
<td class="footer"><label><a href="A1ErrorPage.html">Terms of Service</a></label></td>
<td class="footer"><label><a href="A1ErrorPage.html">Privacy Policy</a></label></td>
<td class="footer"><label><a href="A1ErrorPage.html">Cookie Policy</a></label></td>
</tr>
</div>
</div>



</body>
</html>

