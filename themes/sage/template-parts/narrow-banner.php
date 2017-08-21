<?php
/**
 * Template-part: narrow-banner
 *
 
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */
?>
<?php 
$Hex_Img_Overlay_color = get_field("background_image_overlay_color");
$RGB_Img_Overlay_color = hex2rgb($Hex_Img_Overlay_color);
$Final_Rgb_Img_Overlay_color = implode(", ", $RGB_Img_Overlay_color );
?>

<div class="upper-banner" style="background:linear-gradient( rgba(<?php echo $Final_Rgb_Img_Overlay_color;  ?>,0.7), rgba(<?php echo $Final_Rgb_Img_Overlay_color;  ?>,0.7)), url(<?php echo get_field("banner_image") ?>)no-repeat center right; background-size:content">

	<div class="upper-banner-sqaure" style="background:<?php echo get_field("background_color") ?>">
		 <div class ="upper-banner-text">
			<h4><?php echo get_field("upper_line_of_text") ?></h4>
			<h3> <?php echo get_field("lower_line_of_text") ?> </h3>
		 </div>
	 </div>

	 <div class="upper-banner-triangle hide-for-small-only" style="background:linear-gradient(70deg,<?php echo get_field("background_color")?> 47%,transparent 0px);" >
	 </div>
	 <div class="upper-banner-triangle show-for-small-only" style="background:linear-gradient(175deg,<?php echo get_field("background_color")?> 47%,white 0px);" >
	 </div>
</div>