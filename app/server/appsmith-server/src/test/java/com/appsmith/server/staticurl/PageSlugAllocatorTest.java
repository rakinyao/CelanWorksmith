package com.appsmith.server.staticurl;

import com.appsmith.server.helpers.TextUtils;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PageSlugAllocatorTest {
    @Test
    void emptyCandidatesSkipReservedSuffixesAndReserveEachResult() {
        Set<String> reserved = new HashSet<>(Set.of("page", "page-1"));
        assertThat(PageSlugAllocator.allocate("", reserved)).isEqualTo("page-2");
        assertThat(PageSlugAllocator.allocate("", reserved)).isEqualTo("page-3");
        assertThat(reserved).containsExactlyInAnyOrder("page", "page-1", "page-2", "page-3");
    }

    @Test
    void englishCandidatesRetainBaseAndUseFirstAvailableSuffix() {
        Set<String> reserved = new HashSet<>(Set.of("sales-report-1"));
        assertThat(PageSlugAllocator.allocate("sales-report", reserved)).isEqualTo("sales-report");
        assertThat(PageSlugAllocator.allocate("sales-report", reserved)).isEqualTo("sales-report-2");
    }

    @Test
    void chineseNamesAndNullCandidatesReceiveValidDefaults() {
        Set<String> reserved = new HashSet<>();
        assertThat(PageSlugAllocator.allocate(TextUtils.makeSlug("\u9996\u9875"), reserved))
                .isEqualTo("page");
        assertThat(PageSlugAllocator.allocate(null, reserved)).isEqualTo("page-1");
        assertThat(reserved).allMatch(TextUtils::isSlugFormatValid);
    }
}
