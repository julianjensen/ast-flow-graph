package Graph::Easy::Util;

use strict;
use warnings;

use base 'Exporter';

our @EXPORT_OK = (qw(first_kv ord_values));

use List::Util qw(minstr);

=head1 FUNCTIONS

=head2 first_kv($hash_ref)

The first key value pair from a hash reference - lexicographically.

=cut

sub first_kv
{
    my $href = shift;

    my $n = minstr( keys(%$href) );
    my $v = $href->{$n};

    return ($n, $v);
}

=head2 ord_values($hash_ref)

The values of the hash ordered by a lexicographical keyname.

=cut

sub ord_values
{
    my $href = shift;

    if ((!defined $href) || (! %$href))
    {
        return (wantarray ? () : 0);
    }
    else
    {
        return (wantarray ? @{$href}{sort keys( %$href )} : scalar(keys(%$href)));
    }
}

1;

