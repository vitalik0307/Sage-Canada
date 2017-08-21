<?php
class sage_timeline {

  public function __construct ($atts) {

    $this->orientation = $atts["orientation"];
    $this->title = $atts["title"];
    $this->args = $atts["tax"];
    self::get_time_events();
  }

  public function get_time_events () {

    $args = array(
      "post_type"=>"timeline"
    );

    if (!empty($this->args)) {
      $args['tax_query'] = array(array(
        'taxonomy' => 'page_cat',
        'terms'    => $this->args,
        'field'    => 'slug',
     ));
   }
    $timeline_query = new WP_Query($args);

    if($timeline_query->have_posts()) : ?>

      <div class="timeline-wrap">
        <?php echo self::get_title_shortcode();
        if ($this->orientation == "verticle") { ?>
          <div class="entries">
        <?php }else { ?>
          <div class="horzi_timeline">
         <?php }
          $i = 1;
          while($timeline_query->have_posts()):$timeline_query->the_post();
            if ($this->orientation == "verticle") {
              self::verticle_return();
            }else {
              if ($i % 2 == 0) {
                $this->horzi_top[] = get_the_ID();
              }else {
                $this->horzi_bottom[] = get_the_ID();
              }

            }
            $i++;
          endwhile;
          if ($this->orientation == "horzi") {
            self::horizontal_return();
          }else { ?>
            <div class="timeline_line"></div>
          <?php }?>

        </div>
      </div>
<?php else : 
echo "No event posts found :(";
endif;

  }
  public function verticle_return() {?>

    <div class="entry">
      <div class="title"><?php the_title() ?> <div class="triangle"></div></div>
      <h5> <?php echo get_field("timeline_date"); ?> </h5>
      <div class="body">
            <h3><?php the_field('subheading', $item); ?></h3>
            <p><?php the_field('description', $item); ?></p>
      </div>
    </div> <?php
  }
  public function horizontal_return() { ?>
    <div class="horzi_top">
      <?php foreach ($this->horzi_top as $item) { ?>
        <div class="entry large-3 medium-4 small-6">
          <div class="circle"> </div>
          <div class="title"><?php echo get_the_title($item) ?> <div class="triangle"></div></div>
          <div class="body">
            <h3><?php the_field('subheading', $item); ?></h3>
            <p><?php the_field('description', $item); ?></p>
          </div>
        </div>
      <?php }?>
    </div>
    <div class="timeline_line"></div>
    <div class="horzi_bottom">
      <?php foreach ($this->horzi_bottom as $item) { ?>
        <div class="entry large-3 medium-4 small-6">
          <div class="circle"> </div>
          <div class="title"><?php echo get_the_title($item)?> <div class="triangle"></div></div>
          <div class="body">
          <h3><?php the_field('subheading', $item); ?></h3>
            <p><?php the_field('description', $item); ?></p>
           <!--  <?php echo get_post_field('post_content', $item);  ?> -->
          </div>
        </div>
      <?php }?>
    </div>
  <?php }
  public function get_title_shortcode () {
    echo "<div class='timeline_title'><h3>".$this->title."</h3></div>";
  }
}
