<?php
function products_init($category) {
    $labels = array(
        'name'               => _x( $category, 'post type general name', 'your-plugin-textdomain' ),
        'singular_name'      => _x( $category, 'post type singular name', 'your-plugin-textdomain' ),
        'menu_name'          => _x( $category, 'admin menu', 'your-plugin-textdomain' ),
        'name_admin_bar'     => _x( $category, 'add new on admin bar', 'your-plugin-textdomain' ),
        'add_new'            => _x( 'Add New ', $category, 'your-plugin-textdomain' ),
        'add_new_item'       => __( 'Add New ' .$category, 'your-plugin-textdomain' ),
        'new_item'           => __( 'New ' .$category, 'your-plugin-textdomain' ),
        'edit_item'          => __( 'Edit ' .$category, 'your-plugin-textdomain' ),
        'view_item'          => __( 'View ' .$category, 'your-plugin-textdomain' ),
        'all_items'          => __( 'All ' .$category, 'your-plugin-textdomain' ),
        'search_items'       => __( 'Search ' .$category, 'your-plugin-textdomain' ),
        'parent_item_colon'  => __( 'Parent ' .$category.':', 'your-plugin-textdomain' ),
        'not_found'          => __( 'No ' .$category.' found.', 'your-plugin-textdomain' ),
        'not_found_in_trash' => __( 'No ' .$category.' found in Trash.', 'your-plugin-textdomain' )
    );

    $args = array(
        'labels'             => $labels,
               'description'        => __( 'Description.', 'your-plugin-textdomain' ),
        'public'             => true,
        'publicly_queryable' => true,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'query_var'          => true,
        'rewrite'            => array( 'slug' => $category ),
        'capability_type'    => 'post',
        'has_archive'        => true,
        'hierarchical'       => false,
        'menu_position'      => null,
        'supports'           => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments' )
    );

    return $args;
}

function create_post_categories(){


$post_categories = array("events","entrepreneur","news","timeline","FAQ");


	foreach ($post_categories as $post_category) {
		$post_args = products_init($post_category);
		register_post_type($post_category,$post_args);
	}
};

add_action('init','create_post_categories');

add_action( 'init', 'create_tax', 0 );

// create two taxonomies, genres and writers for the post type "book"
function create_taxonomies($tax,$val) {
    

    // register_taxonomy( 'genre', $taxonomies, $args );

    // Add new taxonomy, NOT hierarchical (like tags)
    $labels = array(
        'name'                       => _x( $tax, 'taxonomy general name', 'textdomain' ),
        'singular_name'              => _x( $tax, 'taxonomy singular name', 'textdomain' ),
        'search_items'               => __( 'Search '.$tax, 'textdomain' ),
        'popular_items'              => __( 'Popular '.$tax, 'textdomain' ),
        'all_items'                  => __( 'All '.$tax, 'textdomain' ),
        'parent_item'                => null,
        'parent_item_colon'          => null,
        'edit_item'                  => __( 'Edit '.$tax, 'textdomain' ),
        'update_item'                => __( 'Update '.$tax, 'textdomain' ),
        'add_new_item'               => __( 'Add New '.$tax, 'textdomain' ),
        'new_item_name'              => __( 'New '.$tax.' Name', 'textdomain' ),
        'separate_items_with_commas' => __( 'Separate '.$tax.' with commas', 'textdomain' ),
        'add_or_remove_items'        => __( 'Add or remove '.$tax, 'textdomain' ),
        'choose_from_most_used'      => __( 'Choose from the most used '.$tax, 'textdomain' ),
        'not_found'                  => __( 'No '.$tax.' found', 'textdomain' ),
        'menu_name'                  => __( $tax, 'textdomain' ),
    );

    $args = array(
        'hierarchical'          => true,
        'labels'                => $labels,
        'show_ui'               => true,
        'show_admin_column'     => true,
        'update_count_callback' => '_update_post_term_count',
        'query_var'             => true,
        'rewrite'               => array( 'slug' => $tax ),
    );

    register_taxonomy( $tax, $val, $args );
}

function create_tax(){

    $taxonomies= array("Category" => "events","Location" => "events","page_cat" => "timeline",);

    foreach ($taxonomies as $tax_key => $tax_val) {

        // echo $tax_key." ".$tax_val;
     create_taxonomies($tax_key,$tax_val);
        // register_taxonomy( 'manufacturer','products', $taxonomies, $args );
    }
};