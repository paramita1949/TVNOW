package androidx.media3.common;

public final class MediaTitle {

    public final int index;
    public final boolean selected;
    public final String label;
    public final long durationUs;

    public MediaTitle(int index, boolean selected, String label, long durationUs) {
        this.index = index;
        this.selected = selected;
        this.label = label;
        this.durationUs = durationUs;
    }
}
