import { ByteArray } from "viem";

export const CONTRACTS = {
    lightlink: {
        UNIVERSAL_ROUTER: "0x6B3ea22C757BbF9C78CcAaa2eD9562b57001720B",
        UNISWAP_V3_FACTORY_ADDRESS:
            "0xEE6099234bbdC793a43676D98Eb6B589ca7112D7",
        UNISWAP_V3_QUOTER_ADDRESS: "0x243551e321Dac40508c22de2E00aBECF17F764b5",
    },

    lightlinkTestnet: {
        UNIVERSAL_ROUTER: "0x742d315e929B188e3F05FbC49774474a627b0502",
        UNISWAP_V3_FACTORY_ADDRESS:
            "0x1F98431c8aD98523631AE4a59f267346364d5Db4",
        UNISWAP_V3_QUOTER_ADDRESS: "0x0000000000000000000000000000000000000000",
    },
};

export const blankKzg = () => ({
    blobToKzgCommitment: function (_: ByteArray): ByteArray {
        throw new Error("Function not implemented.");
    },
    computeBlobKzgProof: function (
        _blob: ByteArray,
        _commitment: ByteArray
    ): ByteArray {
        throw new Error("Function not implemented.");
    },
});
