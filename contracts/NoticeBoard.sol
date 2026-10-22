// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NoticeBoard
 * @notice A tiny on-chain bulletin board. One administrator pins notices,
 *         everybody can read them, and every notice is kept forever.
 * @dev Written as a teaching example: it covers state variables, structs,
 *      dynamic arrays, events, custom errors, modifiers and access control
 *      in under 120 lines.
 */
contract NoticeBoard {
    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    /// @notice A single pinned notice.
    struct Notice {
        string text;      // the notice content
        address author;   // account that pinned it
        uint64 pinnedAt;  // block timestamp when it was pinned
    }

    /*//////////////////////////////////////////////////////////////
                                 STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum notice length, measured in bytes.
    uint256 public constant MAX_BYTES = 280;

    /// @notice Account allowed to pin notices and hand over control.
    address public admin;

    /// @dev Append-only list of every notice ever pinned.
    Notice[] private _notices;

    /*//////////////////////////////////////////////////////////////
                           EVENTS AND ERRORS
    //////////////////////////////////////////////////////////////*/

    event NoticePinned(uint256 indexed id, address indexed author, string text);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    error NotAdmin(address caller);
    error EmptyNotice();
    error NoticeTooLong(uint256 got, uint256 max);
    error UnknownNotice(uint256 id);
    error ZeroAddress();

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin(msg.sender);
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param firstNotice Text for notice #0, pinned during deployment.
    constructor(string memory firstNotice) {
        admin = msg.sender;
        emit AdminTransferred(address(0), msg.sender);
        _pin(firstNotice);
    }

    /*//////////////////////////////////////////////////////////////
                              WRITE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Pin a new notice. Only the admin can call this.
    /// @return id Index of the freshly pinned notice.
    function pin(string calldata text) external onlyAdmin returns (uint256 id) {
        id = _pin(text);
    }

    /// @notice Hand the admin role to another account.
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    /*//////////////////////////////////////////////////////////////
                              READ FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice How many notices have been pinned so far.
    function total() external view returns (uint256) {
        return _notices.length;
    }

    /// @notice The most recent notice.
    function latest() external view returns (Notice memory) {
        return _notices[_notices.length - 1];
    }

    /// @notice Fetch a notice by index (0 is the first one).
    function notice(uint256 id) external view returns (Notice memory) {
        if (id >= _notices.length) revert UnknownNotice(id);
        return _notices[id];
    }

    /*//////////////////////////////////////////////////////////////
                                INTERNALS
    //////////////////////////////////////////////////////////////*/

    function _pin(string memory text) private returns (uint256 id) {
        uint256 size = bytes(text).length;
        if (size == 0) revert EmptyNotice();
        if (size > MAX_BYTES) revert NoticeTooLong(size, MAX_BYTES);

        id = _notices.length;
        _notices.push(Notice({text: text, author: msg.sender, pinnedAt: uint64(block.timestamp)}));
        emit NoticePinned(id, msg.sender, text);
    }
}
