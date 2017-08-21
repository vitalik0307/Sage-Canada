
<?php
/**
 * The template for displaying archive pages
 *
 * Used to display archive-type pages if nothing more specific matches a query.
 * For example, puts together date-based pages if no date.php file exists.
 *
 * If you'd like to further customize these archive views, you may create a
 * new template file for each one. For example, tag.php (Tag archives),
 * category.php (Category archives), author.php (Author archives), etc.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */





get_header(); ?>
<div class="page-template-archive">

<?php if( get_post_type() == 'entrepreneur' ){ 
 echo get_template_part( 'template-parts/upper-banner-archive' );
 } if( get_post_type() == 'events' ) {
	echo get_template_part( 'template-parts/upper-banner-archive-events' );
} if( get_post_type() == 'news' ) {
	echo get_template_part( 'template-parts/upper-banner-archive-news' );
	}?>

</div>

<?php if( get_post_type() == 'events' ) {
   $class = "archive-container-events";
} else {
   $class = "archive-container";
} ?>

<div id="page" role="main">
	<article class="<?php echo $class ?>">
	<?php if ( have_posts() ) : ?>

		<?php /* Start the Loop */ ?>
		<?php while ( have_posts() ) : the_post(); ?>
			<?php get_template_part( 'template-parts/content', get_post_type() ); 

			?>

		<?php endwhile; ?>

		<?php else : ?>
			<?php get_template_part( 'template-parts/content', 'none' ); ?>

		<?php endif; // End have_posts() check. ?>

		<?php /* Display navigation to next/previous pages when applicable */ ?>
		<?php
		if ( function_exists( 'foundationpress_pagination' ) ) :
			foundationpress_pagination();
		elseif ( is_paged() ) :
		?>
			<nav id="post-nav">
				<div class="post-previous"><?php next_posts_link( __( '&larr; Older posts', 'foundationpress' ) ); ?></div>
				<div class="post-next"><?php previous_posts_link( __( 'Newer posts &rarr;', 'foundationpress' ) ); ?></div>
			</nav>
		<?php endif; ?>

	</article>
<!-- 	<?php get_sidebar(); ?>
 -->
</div>

<div class="subscribe">
  <h3>Join our Newsletter</h3>
  <h4>Not ready to get involved just yet? Stay connected!</h4>
  <div class="email">
    <?php echo do_shortcode('[mc4wp_form id="56"]'); ?>
  </div>
</div>

<?php echo get_template_part( 'template-parts/lower-banner-archives' );?>


<?php get_footer();
?>