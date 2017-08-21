<?php 
/*
Template Name: page-program
*/
get_header();?>


<?php while ( have_posts() ) : the_post(); ?>


<!-- UPPER BANNER-->
 <?php get_template_part( 'template-parts/upper-banner' ); ?>

<!-- LEARNING SECTION-->
<div class="ProgramTittle"><h2 class=""><?php the_field('learning_heading');?></h2></div>
<div id="program-learning" >
	
	<!-- FLIP CARDS-->
		<?php for($i=1; $i < 5; $i++) { ?>
		<div class="flip-container card-shadow small-12 medium-3 large-3" ontouchstart="this.classList.toggle('hover');">
  			<div class=" flipper">
  				<!-- Front of Card -->
	    		<div class="front">
	    			<img src="<?php the_field('card_'.$i.'_icon');?>">
	      			<p><?php the_field('card_'.$i.'_front_text'); ?></p>
	    		</div>
	    		<!-- Back of Card -->
	    		<div class="back">
	      			<p><?php the_field('card_'.$i.'_back'); ?></p>
	    		</div>
  			</div>
  		</div>
		<?php } ?>	
</div>
<!-- CALL TO ACTION SECTION-->
<div id="program-cta">
	<h2 class="cta-lead"><?php the_field('cta_heading'); ?></h2>
	<div class="flourish small-centered">
	</div>
	<div class="containerprogram row">
		<p class="columna"><?php the_field('cta_text_block_1');?></p>
		<p class="columna"><?php the_field('cta_text_block_2');?></p>
	</div>

<!-- PROGRAM TIMELINE SECTION-->
<div id="program-timeline">
		<?php echo do_shortcode(get_field('program_timeline_shortcode')); ?> 

	<p> <?php the_field( 'timeline_footer_text'); ?></p>

<?php wp_reset_query(); ?>
<!-- LOWER BANNER-->
<?php get_template_part( 'template-parts/lower-banner' ); ?>


<?php endwhile; ?>
<?php get_footer(); ?>