package com.appsmith.server.staticurl;

import org.springframework.util.StringUtils;

import java.util.Set;

/** Selects and reserves a slug within one allocation operation; persistence enforces database uniqueness. */
final class PageSlugAllocator {
    private PageSlugAllocator() {}

    static String allocate(String preferredSlug, Set<String> reservedSlugs) {
        String baseSlug = StringUtils.hasText(preferredSlug) ? preferredSlug : "page";
        String candidate = baseSlug;
        int suffix = 1;
        while (!reservedSlugs.add(candidate)) {
            candidate = baseSlug + "-" + suffix++;
        }
        return candidate;
    }
}
