
<?php
/**
 * The template for displaying all single posts and attachments
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>



<!-- <div id="single-post" role="main">

<?php do_action( 'foundationpress_before_content' ); ?> -->
<?php while ( have_posts() ) : the_post(); ?>

	<?php get_template_part( 'template-parts/content' , get_post_type() ); ?>
	
<?php endwhile;?>

<!-- <?php do_action( 'foundationpress_after_content' ); ?>
<?php get_sidebar(); ?>
</div> -->
<?php echo get_template_part( 'template-parts/lower-banner-archives' );?>
<?php get_footer();
