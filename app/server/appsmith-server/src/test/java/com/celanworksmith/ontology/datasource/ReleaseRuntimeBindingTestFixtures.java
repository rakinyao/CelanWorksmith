package com.celanworksmith.ontology.datasource;

import java.util.List;

final class ReleaseRuntimeBindingTestFixtures {
    private static final String DATASET = "${source_dataset_id}";

    private ReleaseRuntimeBindingTestFixtures() {}

    static ReleaseRuntimeBindingProperties.Binding businessBinding(
            String workspaceId, String managedBindingId, String runtimeProviderId) {
        return new ReleaseRuntimeBindingProperties.Binding(
                workspaceId,
                "business",
                managedBindingId,
                runtimeProviderId,
                "GOVERNED_DATASET",
                List.of(
                        asset("ont_supplier", "0b63c0dc232e234f765f10d7107d151b2d8510745224fbe48b4d40368129e46a"),
                        asset("ont_customer", "c2b57f2b2340d523567530e6fcf8d226bbd25dbfaa70d6952a58e351af42cff7"),
                        asset("ont_contract", "05a604f8ddeb926d7b31dfb179d04f6e77fe64055d23036891dbc227717a513a"),
                        asset(
                                "ont_purchase_order",
                                "e2a6ea703cc626eb66f108798b30df443ea64f050b030c464fe99d92909bcae6")),
                List.of(
                        link("contract_customer", "583845aa89d240abcb16422173b373362d7f1d94eb119ef6ded863329a0e75b0"),
                        link("contract_supplier", "f74128029cff43df368bbf26d2ddb2bafb73695691eb653bfa8bc5863b669fcf"),
                        link(
                                "purchase_order_contract",
                                "25111aae62cdc4ada005ee3b5e752b72000788f9e4541b411fe810707b50744c"),
                        link(
                                "purchase_order_supplier",
                                "2db62a0a57f326f4a137cb29730055756bff651676da5ef0e84cc9eea8b47dc6")));
    }

    private static ReleaseRuntimeBindingProperties.AssetAuthorization asset(String collection, String digest) {
        return new ReleaseRuntimeBindingProperties.AssetAuthorization(
                DATASET + ":public." + collection, "sha256:" + digest);
    }

    private static ReleaseRuntimeBindingProperties.LinkAuthorization link(String linkId, String digest) {
        return new ReleaseRuntimeBindingProperties.LinkAuthorization(linkId, "sha256:" + digest);
    }
}
