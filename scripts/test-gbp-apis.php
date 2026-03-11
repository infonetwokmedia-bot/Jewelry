<?php
/**
 * Test script to check which Google APIs are enabled for the GBP project.
 * Run: docker exec jewelry_wordpress php /var/www/html/wp-content/mu-plugins/../../test-gbp-apis.php
 */
require '/var/www/html/wp-load.php';

$client_id = get_option('jewelry_gbp_client_id');
$client_secret = get_option('jewelry_gbp_client_secret');
$refresh_token = get_option('jewelry_gbp_refresh_token');

echo "Client ID: " . substr($client_id, 0, 30) . "...\n";
echo "Has secret: " . (!empty($client_secret) ? 'YES' : 'NO') . "\n";
echo "Has refresh: " . (!empty($refresh_token) ? 'YES' : 'NO') . "\n\n";

// Get fresh access token
$resp = wp_remote_post('https://oauth2.googleapis.com/token', array(
    'body' => array(
        'refresh_token' => $refresh_token,
        'client_id'     => $client_id,
        'client_secret' => $client_secret,
        'grant_type'    => 'refresh_token',
    ),
));
$body = json_decode(wp_remote_retrieve_body($resp), true);
if (empty($body['access_token'])) {
    echo "FATAL: Cannot get access token\n";
    echo print_r($body, true) . "\n";
    exit(1);
}
echo "Access token: OK\n\n";
$token = $body['access_token'];

$headers = array('Authorization' => 'Bearer ' . $token);

// Test each API
$tests = array(
    array(
        'name' => 'My Business Account Management API',
        'url'  => 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        'key'  => 'accounts',
    ),
    array(
        'name' => 'Google My Business API (legacy v4)',
        'url'  => 'https://mybusiness.googleapis.com/v4/accounts',
        'key'  => 'accounts',
    ),
    array(
        'name' => 'My Business Business Information API',
        'url'  => 'https://mybusinessbusinessinformation.googleapis.com/v1/accounts/PLACEHOLDER/locations',
        'key'  => 'locations',
        'needs_account' => true,
    ),
    array(
        'name' => 'Business Profile Performance API',
        'url'  => 'https://businessprofileperformance.googleapis.com/v1/locations/PLACEHOLDER:getDailyMetricsTimeSeries?dailyMetric=BUSINESS_IMPRESSIONS_DESKTOP_MAPS&dailyRange.startDate.year=2026&dailyRange.startDate.month=2&dailyRange.startDate.day=1&dailyRange.endDate.year=2026&dailyRange.endDate.month=3&dailyRange.endDate.day=5',
        'key'  => 'metrics',
        'needs_location' => true,
    ),
    array(
        'name' => 'My Business Q&A API',
        'url'  => 'https://mybusinessqanda.googleapis.com/v1/locations/PLACEHOLDER/questions',
        'key'  => 'questions',
        'needs_location' => true,
    ),
);

$account_id = '';
$location_id = '';

foreach ($tests as $test) {
    echo "=== {$test['name']} ===\n";

    $url = $test['url'];

    // Skip tests that need account/location if we don't have them yet
    if (!empty($test['needs_account'])) {
        if (empty($account_id)) {
            echo "SKIPPED (no account_id yet)\n\n";
            continue;
        }
        $url = str_replace('PLACEHOLDER', $account_id, $url);
    }
    if (!empty($test['needs_location'])) {
        if (empty($location_id)) {
            echo "SKIPPED (no location_id yet)\n\n";
            continue;
        }
        $url = str_replace('PLACEHOLDER', $location_id, $url);
    }

    $r = wp_remote_get($url, array('headers' => $headers, 'timeout' => 15));
    $status = wp_remote_retrieve_response_code($r);
    $rbody = wp_remote_retrieve_body($r);
    $decoded = json_decode($rbody, true);

    echo "URL: " . substr($url, 0, 100) . "\n";
    echo "Status: {$status}\n";

    if ($status == 200) {
        echo "RESULT: OK\n";

        // Extract account ID from first successful accounts listing
        if ($test['key'] === 'accounts' && !empty($decoded['accounts'])) {
            $first = $decoded['accounts'][0];
            $account_name = $first['name']; // e.g., "accounts/123456"
            $account_id = str_replace('accounts/', '', $account_name);
            echo "Found account: {$account_name} ({$first['accountName']})\n";
            echo "Account ID: {$account_id}\n";

            // Now try to list locations using the account
            echo "\n--- Discovering locations for account {$account_id} ---\n";
            $loc_url = "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{$account_id}/locations?readMask=name,title,storefrontAddress";
            $lr = wp_remote_get($loc_url, array('headers' => $headers, 'timeout' => 15));
            $lstatus = wp_remote_retrieve_response_code($lr);
            $lbody = json_decode(wp_remote_retrieve_body($lr), true);
            echo "Location API Status: {$lstatus}\n";
            if ($lstatus == 200 && !empty($lbody['locations'])) {
                foreach ($lbody['locations'] as $loc) {
                    $loc_name = $loc['name'];
                    $location_id = str_replace("locations/", '', $loc_name);
                    echo "  Location: {$loc_name} — {$loc['title']}\n";
                    if (!empty($loc['storefrontAddress'])) {
                        $addr = $loc['storefrontAddress'];
                        echo "  Address: " . ($addr['addressLines'][0] ?? '') . ", " . ($addr['locality'] ?? '') . "\n";
                    }
                }
            } else {
                echo "  Location response: " . substr(json_encode($lbody), 0, 300) . "\n";
            }
        }
    } else {
        $err = $decoded['error']['message'] ?? $rbody;
        echo "ERROR: " . substr($err, 0, 200) . "\n";
    }
    echo "\n";
}

echo "\n=== SUMMARY ===\n";
echo "Account ID: " . ($account_id ?: 'NOT FOUND') . "\n";
echo "Location ID: " . ($location_id ?: 'NOT FOUND') . "\n";

// If we found IDs, re-run the tests that were skipped
if (!empty($location_id)) {
    echo "\n--- Re-testing APIs that need location ---\n";

    // Reviews (legacy v4)
    $rurl = "https://mybusiness.googleapis.com/v4/accounts/{$account_id}/locations/{$location_id}/reviews";
    $rr = wp_remote_get($rurl, array('headers' => $headers, 'timeout' => 15));
    echo "Reviews (v4 legacy): " . wp_remote_retrieve_response_code($rr) . "\n";
    $rbody = json_decode(wp_remote_retrieve_body($rr), true);
    if (wp_remote_retrieve_response_code($rr) != 200) {
        echo "  Error: " . substr($rbody['error']['message'] ?? '', 0, 200) . "\n";
    } else {
        echo "  Total: " . ($rbody['totalReviewCount'] ?? count($rbody['reviews'] ?? array())) . " reviews\n";
    }

    // Posts (legacy v4)
    $purl = "https://mybusiness.googleapis.com/v4/accounts/{$account_id}/locations/{$location_id}/localPosts";
    $pr = wp_remote_get($purl, array('headers' => $headers, 'timeout' => 15));
    echo "Posts (v4 legacy): " . wp_remote_retrieve_response_code($pr) . "\n";
    $pbody = json_decode(wp_remote_retrieve_body($pr), true);
    if (wp_remote_retrieve_response_code($pr) != 200) {
        echo "  Error: " . substr($pbody['error']['message'] ?? '', 0, 200) . "\n";
    }

    // Media (legacy v4)
    $murl = "https://mybusiness.googleapis.com/v4/accounts/{$account_id}/locations/{$location_id}/media";
    $mr = wp_remote_get($murl, array('headers' => $headers, 'timeout' => 15));
    echo "Media (v4 legacy): " . wp_remote_retrieve_response_code($mr) . "\n";
    $mbody = json_decode(wp_remote_retrieve_body($mr), true);
    if (wp_remote_retrieve_response_code($mr) != 200) {
        echo "  Error: " . substr($mbody['error']['message'] ?? '', 0, 200) . "\n";
    }

    // Performance metrics
    $perfurl = "https://businessprofileperformance.googleapis.com/v1/locations/{$location_id}:getDailyMetricsTimeSeries?dailyMetric=BUSINESS_IMPRESSIONS_DESKTOP_MAPS&dailyRange.startDate.year=2026&dailyRange.startDate.month=2&dailyRange.startDate.day=1&dailyRange.endDate.year=2026&dailyRange.endDate.month=3&dailyRange.endDate.day=5";
    $perfr = wp_remote_get($perfurl, array('headers' => $headers, 'timeout' => 15));
    echo "Performance metrics: " . wp_remote_retrieve_response_code($perfr) . "\n";
    $perfbody = json_decode(wp_remote_retrieve_body($perfr), true);
    if (wp_remote_retrieve_response_code($perfr) != 200) {
        echo "  Error: " . substr($perfbody['error']['message'] ?? '', 0, 200) . "\n";
    }

    // Q&A
    $qaurl = "https://mybusinessqanda.googleapis.com/v1/locations/{$location_id}/questions";
    $qar = wp_remote_get($qaurl, array('headers' => $headers, 'timeout' => 15));
    echo "Q&A: " . wp_remote_retrieve_response_code($qar) . "\n";
    $qabody = json_decode(wp_remote_retrieve_body($qar), true);
    if (wp_remote_retrieve_response_code($qar) != 200) {
        echo "  Error: " . substr($qabody['error']['message'] ?? '', 0, 200) . "\n";
    }

    // Business Information
    $biurl = "https://mybusinessbusinessinformation.googleapis.com/v1/locations/{$location_id}?readMask=name,title,phoneNumbers,websiteUri,regularHours,storefrontAddress";
    $bir = wp_remote_get($biurl, array('headers' => $headers, 'timeout' => 15));
    echo "Business Info: " . wp_remote_retrieve_response_code($bir) . "\n";
    $bibody = json_decode(wp_remote_retrieve_body($bir), true);
    if (wp_remote_retrieve_response_code($bir) != 200) {
        echo "  Error: " . substr($bibody['error']['message'] ?? '', 0, 200) . "\n";
    } else {
        echo "  Title: " . ($bibody['title'] ?? 'N/A') . "\n";
    }
}
