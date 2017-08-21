<?php
/**
 * Template-part : upper-banner
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

<div class="upper-banner" style="background:linear-gradient( rgba(<?php echo $Final_Rgb_Img_Overlay_color;  ?>,0.5), rgba(<?php echo $Final_Rgb_Img_Overlay_color;  ?>,0.5)), url(<?php echo get_field("banner_image") ?>)no-repeat right; background-size:65%;">

	<div class="upper-banner-sqaure" style="background:<?php echo get_field("background_color") ?>">
		 <div class ="upper-banner-text">
			<p><?php echo get_field("small_banner_text") ?></p>
			<h2> <?php echo get_field("big_banner_text") ?> </h2>


			<?php if (is_front_page() || (is_page(['about','contact','become-a-mentor-or-partner','program'])) ) { ?>
			<a class="button" href="http://www.miquelllabres.com/miquel/projects/sage/contact/">GET STARTED</a>
			<?php } ?>


		 </div>
	 </div>

	 <div class="upper-banner-triangle hide-for-small-only" style="background:linear-gradient(70deg,<?php echo get_field("background_color")?> 47%,transparent 0px);" >
	 </div>
	 <div class="upper-banner-triangle show-for-small-only" style="background:linear-gradient(175deg,<?php echo get_field("background_color")?> 47%,white 0px);" >
	 </div>
</div>


