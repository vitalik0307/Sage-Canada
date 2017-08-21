
<?php
/**
 * The default template for displaying content
 *
 * Used for both single and index/archive/search.
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */
if (is_front_page()){
	$class = 'large-12';
	$med = 'medium-12';
}
?>

<?php 
$color =  get_field("trapezoid");
	

if(is_single()) { ?>



<article class="single" id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
	
	<header class="entry-header" style="background:url(<?php the_post_thumbnail_url("large") ?> )center !important ; background-size:cover !important;"">
	<div class="flexSingle">
	<div id="trapezoide" class="hide-for-small-only" style="background:<?php echo $color ?>" >
		<div class="labelFlex">
			<div class="labelTitle">
				<h1><?php the_title() ?></h1>
				<?php the_excerpt() ?>
				
			</div>	
		</div>
	</div>
	<div id="triangle-bottomleft" class="hide-for-small-only" style="background: linear-gradient(to right top, <?php echo $color ?> 50%, transparent 50%);"></div>
	</div>
	</header>
		<div id="trapezoid" class="show-for-small-only" style="background:<?php echo $color ?>">
			<h1 class="entry-title"><?php the_title(); ?></h1>
			<?php the_excerpt()  ?>
		</div>	
		<div id="triangle-up-left" class="show-for-small-only" style="background: linear-gradient(to right bottom, <?php echo $color ?> 50%, transparent 50%);"></div>




		<div class="box">
			<div class="entry-content">
			<h2><?php the_field('content_title') ?></h2>
					<?php the_content(); ?>
			</div>
		
		</div>
</article>

		<?php		}else{ ?>

		
<div class="small-12 medium-6 <?php echo $med ?> large-4 <?php echo $class ?> columns  entrepeneur" style="background:<?php echo $color ?>" id="post-<?php the_ID(); ?>" <?php post_class('blogpost-entry'); ?> >
	<div class="img" style="background:url(<?php the_post_thumbnail_url("medium") ?> )no-repeat!important ; background-size:cover  !important;" >
		<?php if (is_front_page()){ ?>
	<div class="event-spotlight" style="background:<?php echo $color ?>">
            Entrepreneur Spotlight
          </div>
<?php } ?>

	</div>

	<div id="triangle-bottomleft" style="background: linear-gradient(to right top, <?php echo $color ?> 50%, transparent 50%);"></div>

	<div id="trapezoid" style="background:<?php echo $color ?>">
		
		<h1><?php the_title() ?></h1>
		<?php the_excerpt()  ?>
		<a href="<?php echo get_permalink( $post->ID ); ?>">
		READ MORE</a>

	</div>
	
	
	
	
</div>


<?php } ?>
