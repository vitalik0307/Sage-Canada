<?php 
add_action("pre_get_posts", "change_posts_per_page_archive");
function change_posts_per_page_archive($query) {
   if ($query->is_main_query() && !is_admin() ) {
       if ( $query->is_archive('events')) {
           $query->set( 'posts_per_page', 4);
       }
       elseif ( $query->is_archive('news')  ) {
           $query->set( 'posts_per_page', 4);
       }
       elseif ( $query->is_archive('entrepreneur') ) {
           $query->set( 'posts_per_page', 4);
       };
   }    
}

 ?>