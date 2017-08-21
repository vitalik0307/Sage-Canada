<?php
/**
 * 
 *
 
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */
?>
<?php
$Hex_Img_Overlay_color = get_field("lower_banner_background_image_overlay_color",75);
$RGB_Img_Overlay_color = hex2rgb($Hex_Img_Overlay_color);
$Final_Rgb_Img_Overlay_color = implode(", ", $RGB_Img_Overlay_color );
?>

<div class="lower-banner" style="background:linear-gradient( rgba(<?php echo $Final_Rgb_Img_Overlay_color;  ?>,0.5), rgba(<?php echo $Final_Rgb_Img_Overlay_color;  ?>,0.5)), url(<?php echo get_field("lower_banner_image",75) ?>)center left no-repeat; background-size:cover;">
		
			<p><span class="lower-banner-title"> <?php echo get_field("lower_banner_big_text",75) ?> </span> </p>
		
		<div class="lower-banner-triangle hide-for-small-only" style="background:linear-gradient(290deg,<?php echo get_field("lower_banner_background_color",75)?> 47%,transparent 0px);">
		</div>
		<div class="lower-banner-triangle show-for-small-only" style="background:linear-gradient(175deg,<?php echo get_field("lower_banner_background_color",75)?> 47%,white 0px);">
		</div> 

	 <div class="lower-banner-sqaure" style="background:<?php echo get_field("lower_banner_background_color",75) ?>"> 


		<div class="lower-banner-text">
		<h3> <?php echo get_field("lower_banner_text",75) ?> </h3>
		<a class="button">Apply today ></a>
		</div>


	</div>

	




</div>

