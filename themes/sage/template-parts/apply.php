<?php
/**
* Template Name: apply
*

*
* @package FoundationPress
* @since FoundationPress 1.0.0
*/ ?>


<?php get_header(); ?>

<?php get_template_part( 'template-parts/upper-banner' );
    while ( have_posts() ) : the_post();
         the_content();
    
    ?>

    <div class="hide-for-small-only">
        <?php echo do_shortcode(get_field('shortcode_for_apply_page')); ?>
    </div>
    <div class="show-for-small-only">
        <?php echo do_shortcode(get_field('shortcode_for_mobile_apply')); ?>
    </div>
    
    <?php endwhile; ?>
    <?php wp_reset_query(); ?>
    
<?php get_template_part( 'template-parts/lower-banner' ); ?>


<?php get_footer(); ?>