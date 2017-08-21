<?php /* Template Name: Home
[logoshowcase] */ ?>

<?php get_header(); ?>
<?php get_template_part( 'template-parts/upper-banner' );?>
<div class="home-container">
  <h1 class="subtitle"><?php echo get_field("subtitle"); ?></h1>
  <div class="home-flex">
    <div class="box">
      <h2>Workshops</h2>

      <div class="icons">
        <?php if ( get_field('workshops-icon') ) {
          $imgarray = get_field( 'workshops-icon' );
          $size = "thumbnail"; // (thumbnail, medium, large, full or custom size)
          echo wp_get_attachment_image( $imgarray['id'], $size );}
        ?>
      </div>
      <p>
        <?php if(get_field('workshops')){echo get_field('workshops');} ?>
      </p>
    </div>
    <div class="box">
      <h2>Mentorship</h2>
      <div class="icons">
        <?php if ( get_field('mentorships-icon') ) {
          $imgarray = get_field( 'mentorships-icon' );
          $size = "thumbnail"; // (thumbnail, medium, large, full or custom size)
          echo wp_get_attachment_image( $imgarray['id'], $size );}
        ?>
      </div>
      <p>
        <?php if(get_field('mentorships')){echo get_field('mentorships');} ?>
      </p>
    </div>
    <div class="box">
      <h2>Competition</h2>
      <div class="icons">
        <?php if ( get_field('competitions-icon') ) {
          $imgarray = get_field( 'competitions-icon' );
          $size = "thumbnail"; // (thumbnail, medium, large, full or custom size)
          echo wp_get_attachment_image( $imgarray['id'], $size );}
        ?>
      </div>
      <p>
        <?php if(get_field('competitions')){echo get_field('competitions');} ?>
      </p>
    </div>
  </div>
  <div class="blue-btn">
    <a href="<?php the_permalink(); ?>">Learn about our program > </a>
  </div>
</div>
<!-- Community section -->

<div>
  <h1 style="color:red; margin: 0 auto; text-align: center; font-size:3rem;">Community</h1>
<div class="homeWrap">
  <div class="homeFlex">
     <?php  $query_events = new WP_Query(array(
        "posts_per_page" => 1,
        'post_type' => 'events',
        "order"=> "DESC" ));?>
        <?php while ( $query_events->have_posts() ) : $query_events->the_post(); ?>
        <?php get_template_part( 'template-parts/content', get_post_type() ); ?>
        <?php endwhile; ?>
      <div class="flexcolumn">
        <div class="size50">
          <?php $query_entre = new WP_Query(array(
            "posts_per_page" => 1,
            'post_type' => 'entrepreneur',
            "order"=> "DESC"));?>
          <?php while ( $query_entre->have_posts() ) : $query_entre->the_post(); ?>
          <?php get_template_part( 'template-parts/content', get_post_type() ); ?>
          <?php endwhile; ?>
        </div>
        <div class="size50 second">

        <?php $query_news = new WP_Query(array(
        "posts_per_page" => 1,
        'post_type' => 'news',
        "order"=> "DESC" ));?>
      
        <?php while ( $query_news->have_posts() ) : $query_news->the_post(); ?>
        <?php get_template_part( 'template-parts/content', get_post_type() ); ?>
        <?php endwhile; 
        wp_reset_query();
        ?>
        </div>
      </div>
  </div>

</div>
</div>

<!-- END COMMUNITY -->


 <!-- Quote section -->


 <div class="quote-block">
  <div class="quote-mark">
    <p>&rdquo;</p>
  </div>
  <p class="quote">
      <?php the_field('quote'); ?>
  </p>
  <p class="quote-author">  <?php the_field('quote-author'); ?></p>
</div> 
<!--  Partner section -->
<div class="partner-logos">

  <h2>Our Partners</h2>
  <div class="blueline"></div>
  <?php echo do_shortcode('[logoshowcase]');  ?>
</div> 
<!--  LOWER BANNER-->
<?php echo get_template_part( 'template-parts/lower-banner' );?>


<?php get_footer();
?> 
