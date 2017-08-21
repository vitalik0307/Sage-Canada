
<?php
/**
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
$color =  get_field("label");
	

if(is_single()) { ?>



<article class="single" id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
	
	<header class="entry-header" style="background:url(<?php the_post_thumbnail_url("large") ?>) center !important ; background-size:cover !important;" >
	<!-- <div class="img"> -->
	<div class="flexSingle">
	<div id="trapezoide" class="hide-for-small-only" style="background:<?php echo $color ?>" >
		<div class="labelFlex">
		
		<?php 
		$test =	get_field('date');
		$test = DateTime::createFromFormat("dmY",$test);
		echo "<div class='date' style='color:$color'><h2>".$test->format("d")."</h2>";
		echo "<p>".$test->format("M")." ".$test->format("Y")."</p></div>";	
		?>
			<div class="labelTitle">
				<h1><?php the_title() ?></h1>
				<?php the_excerpt() ?>
				
			</div>	
		</div>
	</div>
	<div id="triangle-bottomleft" class="hide-for-small-only" style="background: linear-gradient(to right top, <?php echo $color ?> 50%, transparent 50%);"></div>
	</div>
	<!-- </div> -->
	</header>
		<div id="trapezoid" class="show-for-small-only" style="background:<?php echo $color ?>">
		<div class="labelFlex">
		
		<?php 
		$test =	get_field('date');
		$test = DateTime::createFromFormat("dmY",$test);
		echo "<div class='date' style='color:$color'><h2>".$test->format("d")."</h2>";
		echo "<p>".$test->format("M")." ".$test->format("Y")."</p></div>";	
		?>
			<div>
				<h1><?php the_title() ?></h1>
				
			</div>	
		</div>
		<?php the_excerpt()  ?>
		</div>
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

		
<div class="small-12 medium-6 <?php echo $med ?> large-6 <?php echo $class ?> columns  entrepeneur" style="background:<?php echo $color ?>" id="post-<?php the_ID(); ?>" <?php post_class('blogpost-entry'); ?> >
	<div class="img" style="background:url(<?php the_post_thumbnail_url("medium") ?> )no-repeat!important ; background-size:cover  !important;" >
		<?php if (is_front_page()){ ?>
	<div class="event-spotlight" style="background:<?php echo $color ?>">
            Events Spotlight
          </div>
<?php } ?>
	</div>

	<div id="triangle-bottomleft" style="background: linear-gradient(to right top, <?php echo $color ?> 50%, transparent 50%);"></div>

	<div id="trapezoid" style="background:<?php echo $color ?>">
		<?php 
		$test =	get_field('date');
		$test = DateTime::createFromFormat("dmY",$test);
		echo "<div class='date' style='color:$color'><h2>".$test->format("d")."</h2>";
		echo "<p>".$test->format("M")." ".$test->format("Y")."</p></div>";	
	?> 
		<h1><?php the_title() ?></h1>
		<?php the_excerpt()  ?>
		<a href="<?php echo get_permalink( $post->ID ); ?>">
		READ MORE</a>

	</div>
	
	
	<footer>
		<?php $tag = get_the_tags(); if ( $tag ) { ?><p><?php the_tags(); ?></p><?php } ?>
	</footer>
	
</div>
<?php } ?>