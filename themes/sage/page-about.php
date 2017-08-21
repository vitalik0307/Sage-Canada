
<?php get_header(); ?>
 <?php get_template_part( 'template-parts/upper-banner' );?>

<div class="about-container">
    <h1 class="subtitle"><?php echo get_field("subtitle"); ?></h1>
    <div class="blueline"></div>

    <div class="about">
      <div class="col1">
        <p><?php echo get_field("about-col-1"); ?></p>
      </div>
      <div class="col2">
        <p><?php echo get_field("about-col-2"); ?></p>
      </div>

    </div>
</div>

<div class="quote-block">
  <div class="quote-mark">
    <p>&rdquo;</p>
  </div>
  <p class="quote">
      <?php echo get_field("quote"); ?>
  </p>
  <p class="quote-author">  <?php echo get_field("quote-author"); ?></p>
</div>
<?php get_template_part( 'template-parts/lower-banner' );?>
