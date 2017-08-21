<?php 
/*
Template Name: page-faq
*/
get_header();?>


<?php while ( have_posts() ) : the_post(); ?>

<h2 class="faq-title small-centered"><?php the_title(); ?></h2>
<div class="flourish small-centered"></div>

<?php 
$args = array ("post_type"=>"faq","posts_per_page" => -1); 
$faq_query = new WP_Query ($args); 
if ($faq_query->have_posts()): ?>

					<ul id="the-faqs" class="accordion faq small-12 medium-6 small-4" data-accordion role="tablist">
<?php $i=1; while($faq_query->have_posts()):$faq_query->the_post(); ?>
					  <li class="accordion-item" data-accordion-item>
					    <!-- The tab title needs role="tab", an href, a unique ID, and aria-controls. -->
					    <a href="#panel<?php echo $i?>d" role="tab" class="faq-question accordion-title" id="panel1d-heading" aria-controls="panel1d"><?php the_field('question'); ?></a>
					    <!-- The content pane needs an ID that matches the above href, role="tabpanel", data-tab-content, and aria-labelledby. -->
					    <div id="panel<?php echo $i?>d" class="accordion-content faq-answer" role="tabpanel" data-tab-content aria-labelledby="panel1d-heading">
					      <?php the_field('answer'); ?>
					    </div>
					  </li>
		<?php $i++; endwhile; ?>			  
					</ul>
		<?php endif; ?>

<!-- <?php endwhile; ?> -->
<?php get_footer(); ?>
