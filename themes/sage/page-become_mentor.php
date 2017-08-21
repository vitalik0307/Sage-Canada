<?php /* Template Name: Become a mentor or partner
[logoshowcase] */ ?>


<?php get_header(); ?>
<?php get_template_part( 'template-parts/upper-banner' );?>


<div class="become-container">
  <h1 class="subtitle"><?php echo get_field("subtitle"); ?></h1>

  <div class="become-mentor-flex">
    <div class="box1">
      <h2>Mentors</h2>
      <div class="icons">
        <?php if ( get_field('icon1') ) {
          $imgarray = get_field( 'icon1' );
          $size = "thumbnail"; // (thumbnail, medium, large, full or custom size)
          echo wp_get_attachment_image( $imgarray['id'], $size );}
        ?>
      </div>
      <p>
        <?php if(get_field('about-col-1')){echo get_field('about-col-1');} ?>
      </p>
    </div>

    <div class="box1">
      <h2>Partners</h2>
      <div class="icons">
        <?php if ( get_field('icon2') ) {
          $imgarray = get_field( 'icon2' );
          $size = "thumbnail"; // (thumbnail, medium, large, full or custom size)
          echo wp_get_attachment_image( $imgarray['id'], $size );}
        ?>
      </div>
      <p>
        <?php if(get_field('about-col-1')){echo get_field('about-col-1');} ?>
      </p>
    </div>
  </div>
  <div class="blue-btn">
    <a href="<?php the_permalink(); ?>">Get in touch > </a>
  </div>
</div>

<div class="partner-logos">
  <h2>Our Partners</h2>
  <div class="blueline"></div>
  <?php echo do_shortcode('[logoshowcase]');  ?>
</div>

<!--  LOWER BANNER-->


<div class="subscribe">
  <h3>Join our Newsletter</h3>
  <h4>Not ready to get involved just yet? Stay connected!</h4>
  <div class="email">
    <?php echo do_shortcode('[mc4wp_form id="56"]'); ?>
  </div>
</div>
<?php echo get_template_part( 'template-parts/lower-banner' );?>
<?php wp_footer(); ?>
